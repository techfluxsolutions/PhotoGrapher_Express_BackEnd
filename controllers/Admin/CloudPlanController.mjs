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
            const query = {};
            // If not an admin, we show generic plans OR plans specifically for this client
            if (req.user && req.user.role !== "admin") {
                if (req.user.role === "user" || !req.user.role) {
                    query.$or = [
                        { client_id: req.user.id },
                        { client_id: { $exists: false } },
                        { client_id: null }
                    ];
                }
            }

            let cloudPlans = await CloudPlans.find(query).populate("booking_id");

            // Further filter for photographers (they see all generic plans + their assigned booking plans)
            if (req.user && req.user.role === "photographer") {
                cloudPlans = cloudPlans.filter(cp => {
                    // Generic plan: no booking_id or client_id
                    if (!cp.booking_id && !cp.client_id) return true;
                    
                    // Assigned to them:
                    return cp.booking_id && (
                        String(cp.booking_id.photographer_id) === String(req.user.id) ||
                        (Array.isArray(cp.booking_id.photographerIds) && cp.booking_id.photographerIds.some(id => String(id) === String(req.user.id)))
                    );
                });
            }

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

            const options = {
                amount: Math.round(planTemplate.charges * 100),
                currency: "INR",
                receipt: `cloudplan_${bookingId}_${Date.now()}`,
            };

            const order = await razorpayInstance.orders.create(options);

            // Create a pending CloudPlan record for this booking 
            const cloudPlan = new CloudPlans({
                charges: planTemplate.charges,
                days: planTemplate.days,
                booking_id: bookingId,
                client_id: req.user.id,
                razorpayOrderId: order.id,
                isPaid: false
            });
            await cloudPlan.save();

            res.status(200).json({ success: true, order, cloudPlanId: cloudPlan._id });
        } catch (error) {
            next(error);
        }
    }

    async verifyCloudPlanPayment(req, res, next) {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature, cloudPlanId } = req.body;

            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest("hex");

            if (expectedSignature !== razorpay_signature) {
                return res.status(400).json({ success: false, message: "Invalid payment signature" });
            }

            const cloudPlan = await CloudPlans.findById(cloudPlanId);
            if (!cloudPlan) {
                return res.status(404).json({ success: false, message: "Cloud Plan record not found" });
            }

            const booking = await ServiceBooking.findById(cloudPlan.booking_id);
            if (!booking) {
                return res.status(404).json({ success: false, message: "Booking not found" });
            }

            // Calculate current expiry
            let currentExpiry;
            // Fallback to 14 days from firstPhotoUploadedAt or createdAt
            const baseDate = booking.firstPhotoUploadedAt || booking.createdAt;
            const initialExpiry = new Date(baseDate);
            initialExpiry.setDate(initialExpiry.getDate() + 14);

            // Check if there is an ALREADY PAID plan for this booking to extend from
            const lastPaidPlan = await CloudPlans.findOne({
                booking_id: booking._id,
                isPaid: true,
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
            newExpiry.setDate(newExpiry.getDate() + cloudPlan.days);

            cloudPlan.isPaid = true;
            cloudPlan.expiry_date = newExpiry;
            cloudPlan.razorpayPaymentId = razorpay_payment_id;
            await cloudPlan.save();

            // Create CloudPayment record for tracking
            await CloudPayment.create({
                user_id: req.user.id,
                booking_id: booking._id,
                cloud_plan_id: cloudPlan._id,
                amount: cloudPlan.charges,
                payment_status: "paid",
                razorpay_order_id: razorpay_order_id,
                razorpay_payment_id: razorpay_payment_id,
                razorpay_signature: razorpay_signature,
                payment_date: new Date()
            });

            res.status(200).json({ 
                success: true, 
                message: "Cloud plan activated successfully", 
                expiry_date: newExpiry 
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new CloudPlanController();
