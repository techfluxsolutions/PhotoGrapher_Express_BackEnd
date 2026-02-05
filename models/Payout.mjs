import mongoose from "mongoose";

const payoutSchema = new mongoose.Schema(
  {
    photographer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Photographer",
      required: [true, "Photographer ID is required"],
    },
    job_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job ID is required"],
    },
    payout_amount: {
      type: Number, // This might be redundant if we have paid_amount, keeping for backward compatibility or as 'current transaction amount'
      required: false, // Made optional as we are moving to summary model
      min: 0,
    },
    total_amount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: 0,
    },
    paid_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    pending_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Partial", "Paid"],
      default: "Pending",
    },
    payout_status: { // Deprecated/Legacy support
      type: String,
      enum: ["pending", "processed", "failed"],
      default: "pending",
    },
    payout_date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "payouts",
  }
);

// Virtual: Is Processed?
payoutSchema.virtual("isProcessed").get(function () {
  return this.status === "Paid";
});

// Index
payoutSchema.index({ photographer_id: 1, job_id: 1 }, { unique: true }); // Ensure one payout summary per job
payoutSchema.index({ status: 1 });
payoutSchema.index({ payout_date: -1 });

export default mongoose.model("Payout", payoutSchema);
