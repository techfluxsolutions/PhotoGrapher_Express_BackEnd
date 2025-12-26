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
      type: Number,
      required: [true, "Payout amount is required"],
      min: 0,
    },
    payout_status: {
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
  return this.payout_status === "processed";
});

// Index
payoutSchema.index({ photographer_id: 1, job_id: 1 });
payoutSchema.index({ payout_status: 1 });
payoutSchema.index({ payout_date: -1 });

export default mongoose.model("Payout", payoutSchema);
