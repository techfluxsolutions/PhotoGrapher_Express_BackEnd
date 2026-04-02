import mongoose from "mongoose";

const cloudPaymentSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceBooking",
      required: [true, "Booking ID is required"],
    },
    cloud_plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CloudPlans",
      required: [true, "Cloud Plan ID is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    payment_status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    payment_date: {
      type: Date,
      default: Date.now,
    },
    razorpay_order_id: {
      type: String,
      default: null,
    },
    razorpay_payment_id: {
      type: String,
      default: null,
    },
    razorpay_signature: {
      type: String,
      default: null,
    },
    receipt: {
      type: String,
      default: null,
    },
    expiry_date: {
      type: Date,
      default: null,
    },
    invoice_number: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
    collection: "cloud_payments",
  }
);

// Indexes for faster querying
cloudPaymentSchema.index({ user_id: 1, booking_id: 1, cloud_plan_id: 1 });
cloudPaymentSchema.index({ payment_status: 1 });
cloudPaymentSchema.index({ payment_date: -1 });

export default mongoose.model("CloudPayment", cloudPaymentSchema);
