import CloudPlans from "../../models/CloudPlans.mjs";
import ServiceBooking from "../../models/ServiceBookings.mjs";
import razorpayInstance from "../../Config/razorpay.mjs";
import crypto from "crypto";
import Payment from "../../models/Payment.mjs";
import CloudPayment from "../../models/CloudPayment.mjs";

class CloudPlanController {
    async create(req, res, next) {
        try {
            const { charges, days } = req.body;
            const cloudPlan = new CloudPlans({ charges, days });
            await cloudPlan.save();
            res.status(201).json({ success: true, data: cloudPlan });
        } catch (error) {
            next(error);
        }
    }
    async getAll(req, res, next) {
        try {
            const cloudPlans = await CloudPlans.find({});
            res.status(200).json({ success: true, data: cloudPlans });
        } catch (error) {
            next(error);
        }
    }
    async getOne(req, res, next) {
        try {
            const { id } = req.params;
            const cloudPlan = await CloudPlans.findById(id);
            res.status(200).json({ success: true, data: cloudPlan });
        } catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { charges, days } = req.body;
            const cloudPlan = await CloudPlans.findByIdAndUpdate(id, { charges, days }, { new: true });
            res.status(200).json({ success: true, data: cloudPlan });
        } catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const cloudPlan = await CloudPlans.findByIdAndDelete(id);
            res.status(200).json({ success: true, data: cloudPlan });
        } catch (error) {
            next(error);
        }
    }

    async createCloudPlanOrder(req, res, next) {
        try {
            const { bookingId, planId } = req.body;
            const planTemplate = await CloudPlans.findById(planId);
            const booking = await ServiceBooking.findById(bookingId);

            if (!planTemplate || !booking) {
                return res.status(404).json({ success: false, message: "Plan or Booking not found" });
            }

            const receipt = `cp_${bookingId}_${Math.floor(Date.now() / 1000)}`.substring(0, 40);

            const options = {
                amount: Math.round(planTemplate.charges * 100),
                currency: "INR",
                receipt: receipt,
            };

            const order = await razorpayInstance.orders.create(options);

            // Create a pending CloudPayment record for this booking instead of using CloudPlans model for tracking
            const paymentRecord = new CloudPayment({
                amount: planTemplate.charges,
                booking_id: bookingId,
                user_id: req.user.id,
                cloud_plan_id: planId,
                razorpay_order_id: order.id,
                payment_status: "pending",
                receipt: receipt
            });
            await paymentRecord.save();

            res.status(200).json({ success: true, order, cloudPlanId: paymentRecord._id, amountINR: planTemplate.charges });
        } catch (error) {
            next(error);
        }
    }

    async verifyCloudPlanPayment(req, res, next) {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature, cloudPlanId } = req.body;

            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !cloudPlanId) {
                return res.status(400).json({ success: false, message: "Missing required payment verification fields" });
            }

            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest("hex");

            if (expectedSignature !== razorpay_signature) {
                return res.status(400).json({ success: false, message: "Invalid payment signature" });
            }

            // cloudPlanId in the request refers to the CloudPayment record ID.
            // We'll also try to find by razorpay_order_id as a fallback for robustness.
            let paymentRecord = await CloudPayment.findById(cloudPlanId).populate("cloud_plan_id");
            
            if (!paymentRecord && razorpay_order_id) {
                paymentRecord = await CloudPayment.findOne({ razorpay_order_id }).populate("cloud_plan_id");
            }

            if (!paymentRecord) {
                return res.status(404).json({ success: false, message: `Cloud Payment record not found for Order: ${razorpay_order_id}` });
            }

            if (!paymentRecord.booking_id) {
                return res.status(400).json({ success: false, message: "This payment record is not linked to any booking." });
            }

            const booking = await ServiceBooking.findById(paymentRecord.booking_id);
            if (!booking) {
                return res.status(404).json({ success: false, message: "Associated booking not found" });
            }

            // Calculate current expiry
            let currentExpiry;
            // Fallback to 14 days from firstPhotoUploadedAt or createdAt
            const baseDate = booking.firstPhotoUploadedAt || booking.createdAt;
            const initialExpiry = new Date(baseDate);
            initialExpiry.setDate(initialExpiry.getDate() + 14);

            // Check if there is an ALREADY PAID plan in CloudPayment for this booking to extend from
            const lastPaidPlan = await CloudPayment.findOne({
                booking_id: booking._id,
                payment_status: "paid",
                _id: { $ne: cloudPlanId }
            }).sort({ expiry_date: -1 });

            if (lastPaidPlan && lastPaidPlan.expiry_date) {
                currentExpiry = new Date(lastPaidPlan.expiry_date);
            } else {
                currentExpiry = initialExpiry;
            }

            const now = new Date();
            let newExpiry;
            if (now > currentExpiry) {
                // Already expired, start from now
                newExpiry = new Date(now);
            } else {
                // Not expired, extend from existing expiry date
                newExpiry = new Date(currentExpiry);
            }
            
            const daysToExtend = paymentRecord.cloud_plan_id ? paymentRecord.cloud_plan_id.days : 0;
            newExpiry.setDate(newExpiry.getDate() + daysToExtend);

            // Update the CloudPayment record
            paymentRecord.payment_status = "paid";
            paymentRecord.expiry_date = newExpiry;
            paymentRecord.razorpay_payment_id = razorpay_payment_id;
            paymentRecord.razorpay_signature = razorpay_signature;
            paymentRecord.payment_date = new Date();
            await paymentRecord.save();

            res.status(200).json({ 
                success: true, 
                message: "Cloud plan activated successfully", 
                expiry_date: newExpiry,
                amount: paymentRecord.amount,
                planId: cloudPlanId
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new CloudPlanController();
