import Payment from "../../models/Payment.mjs";
import ServiceBooking from "../../models/ServiceBookings.mjs";
import razorpayInstance from "../../Config/razorpay.mjs";
import crypto from "crypto";

class PaymentController {
  async createRazorpayOrder(req, res, next) {
    try {
      const { bookingId, paymentType } = req.body;
      const booking = await ServiceBooking.findById(bookingId);

      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found" });
      }

      let amountToPay = 0;

      if (booking.paymentStatus === "fully paid") {
        return res.status(400).json({ success: false, message: "Booking is already fully paid" });
      }

      if (booking.paymentStatus === "pending") {
        // First payment
        if (paymentType === "partial") {
          amountToPay = booking.totalAmount * 0.5;
        } else {
          amountToPay = booking.totalAmount;
        }
      } else if (booking.paymentStatus === "partially paid") {
        // Second payment (paying the rest)
        amountToPay = booking.outStandingAmount > 0 ? booking.outStandingAmount : (booking.totalAmount * 0.5);
      } else {
        // Fallback
        amountToPay = booking.outStandingAmount > 0 ? booking.outStandingAmount : booking.totalAmount;
      }

      if (!amountToPay || amountToPay <= 0) {
        return res.status(400).json({ success: false, message: "Invalid amount or booking already paid" });
      }

      const options = {
        amount: Math.round(amountToPay * 100), // amount in paise
        currency: "INR",
        receipt: `receipt_${bookingId}`,
        notes: {
          paymentType: paymentType || (booking.paymentStatus === "partially paid" ? "remaining" : "full")
        }
      };

      const order = await razorpayInstance.orders.create(options);

      booking.razorpayOrderId = order.id;
      await booking.save();

      return res.status(200).json({ success: true, order });
    } catch (error) {
      console.error("Error creating Razorpay order:", error);
      res.status(500).json({ success: false, message: "Failed to create order", error: error.message });
    }
  }

  async verifyRazorpayPayment(req, res, next) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
        return res.status(400).json({ success: false, message: "Missing required payment parameters" });
      }

      const body = razorpay_order_id + "|" + razorpay_payment_id;

      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ success: false, message: "Invalid payment signature" });
      }

      // Signature is valid, let's update booking and create payment record
      const booking = await ServiceBooking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found" });
      }

      const order = await razorpayInstance.orders.fetch(razorpay_order_id);
      const paymentType = order.notes?.paymentType || "full";

      const paidAmount = order.amount / 100;


      // updating payment table
      let payment;
      const isPaymentExisted = await Payment.findOne({ job_id: bookingId });

      if (!isPaymentExisted) {
        payment = await Payment.create({
          user_id: req.user.id,
          job_id: bookingId,
          upfront_amount: paidAmount,
          payment_status: "paid",
          outstanding_amount: booking.totalAmount - paidAmount,
          paid_type: `${paymentType === "partial" ? "partial paid" : "full paid"}`
        });
      } else {
        isPaymentExisted.payment_status = "paid";
        isPaymentExisted.outstanding_amount = 0;
        await isPaymentExisted.save();
        payment = isPaymentExisted;
      }
      // Update booking based on what was paid
      if (booking.paymentStatus === "pending") {
        if (paymentType === "partial") {
          booking.paymentStatus = "partially paid";
          booking.partial_Payment = true;
          booking.outStandingAmount = booking.totalAmount - paidAmount;
        } else {
          booking.paymentStatus = "fully paid";
          booking.full_Payment = true;
          booking.outStandingAmount = 0;
          booking.fullyPaidAt = new Date();
        }
      } else if (booking.paymentStatus === "partially paid") {
        booking.paymentStatus = "fully paid";
        booking.full_Payment = true;
        booking.outStandingAmount = 0;
        booking.fullyPaidAt = new Date();
      }

      booking.paymentMode = "online";
      booking.paymentDate = new Date().toISOString();
      await booking.save();
      return res.status(200).json({ success: true, message: "Payment verified successfully", payment });
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ success: false, message: "Payment verification failed", error: error.message });
    }
  }



  async handlePaymentSuccess(payload) {
    const payment = payload.payment.entity;
    const order = payload.order ? payload.order.entity : null;

    const razorpayOrderId = payment.order_id || (order ? order.id : null);
    const razorpayPaymentId = payment.id;
    const paidAmount = payment.amount / 100;

    // Find booking using notes or order_id (you can store bookingId in notes while creating order)
    const booking = await ServiceBooking.findOne({
      // Add a field like razorpayOrderId in your Booking model for easy lookup
      razorpayOrderId: razorpayOrderId
    });

    if (!booking) return;

    // Prevent duplicate processing
    if (booking.paymentStatus === "fully paid") return;

    // Update Payment collection (similar to your verify function)
    let paymentRecord = await Payment.findOne({ job_id: booking._id, payment_status: "pending" });

    if (!paymentRecord) {
      paymentRecord = await Payment.create({
        user_id: booking.client_id, // adjust as per your schema
        job_id: booking._id,
        upfront_amount: paidAmount,
        payment_status: "paid",
        outstanding_amount: booking.totalAmount - paidAmount,
        paid_type: booking.paymentStatus === "pending" ? "partial paid" : "full paid",
        razorpayPaymentId,
        razorpayOrderId
      });
    } else {
      paymentRecord.payment_status = "paid";
      paymentRecord.outstanding_amount = 0;
      await paymentRecord.save();
    }

    // Update Booking
    if (booking.paymentStatus === "pending") {
      if (paidAmount < booking.totalAmount) {
        booking.paymentStatus = "partially paid";
        booking.partial_Payment = true;
        booking.outStandingAmount = booking.totalAmount - paidAmount;
      } else {
        booking.paymentStatus = "fully paid";
        booking.full_Payment = true;
        booking.outStandingAmount = 0;
        booking.fullyPaidAt = new Date();
      }
    } else if (booking.paymentStatus === "partially paid") {
      booking.paymentStatus = "fully paid";
      booking.full_Payment = true;
      booking.outStandingAmount = 0;
      booking.fullyPaidAt = new Date();
    }

    booking.paymentMode = "online";
    booking.paymentDate = new Date();
    booking.razorpayOrderId = razorpayOrderId; // Store for future reference
    await booking.save();
  }

  async handlePaymentAuthorized(payload) {
    // Optional: Auto-capture if you use manual capture
    // Or just mark as "authorized" for now
    console.log("Payment authorized:", payload.payment.entity.id);
  }

  async handlePaymentFailed(payload) {
    const payment = payload.payment.entity;
    const booking = await ServiceBooking.findOne({ razorpayOrderId: payment.order_id });

    if (booking) {
      booking.paymentStatus = "pending"; // or add failed status
      await booking.save();
    }
  }
  async create(req, res, next) {
    try {
      const payload = req.body;
      const payment = await Payment.create(payload);
      return res.status(201).json({ success: true, data: payment });
    } catch (err) {
      return next(err);
    }
  }

  async getAll(req, res, next) {
    try {
      const data = await Payment.find();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Payment.findById(id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Payment not found" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Payment.findByIdAndUpdate(id, req.body, { new: true });
      if (!data) {
        return res.status(404).json({ success: false, message: "Payment not found" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Payment.findByIdAndDelete(id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Payment not found" });
      }
      res.status(200).json({ success: true, message: "Payment deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  async refund(req, res, next) {
    try {
      const { id } = req.params;
      const payment = await Payment.findById(id);
      if (!payment)
        return res
          .status(404)
          .json({ success: false, error: "Payment not found" });
      payment.payment_status = "refunded";
      await payment.save();
      return res.json({ success: true, data: payment });
    } catch (err) {
      return next(err);
    }
  }
}

export default new PaymentController();
