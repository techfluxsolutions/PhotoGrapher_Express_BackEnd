import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    quote_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quote",
      required: [true, "Quote ID is required"],
    },
    job_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job ID is required"],
    },
    upfront_amount: {
      type: Number,
      required: [true, "Upfront amount is required"],
      min: 0,
    },
    outstanding_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    payment_date: {
      type: Date,
      default: Date.now,
    },
    payment_status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    invoice_number: {
      type: String,
      unique: true,
      sparse: true, // Allow null/undefined values
    },
    invoice_file: {
      type: String, // URL or file path to invoice PDF
    },
  },
  {
    timestamps: true,
    collection: "payments",
  }
);

// Pre-save hook: validate amounts
paymentSchema.pre("validate", function (next) {
  if (this.upfront_amount < 0 || this.outstanding_amount < 0) {
    next(new Error("Amounts cannot be negative"));
  } else {
    next();
  }
});

// Virtual: Total Paid
paymentSchema.virtual("totalPaid").get(function () {
  return (
    this.upfront_amount +
    (this.payment_status === "paid" ? 0 : this.outstanding_amount)
  );
});

// Index
paymentSchema.index({ user_id: 1, quote_id: 1, job_id: 1 });
paymentSchema.index({ payment_status: 1 });
paymentSchema.index({ payment_date: -1 });

export default mongoose.model("Payment", paymentSchema);
