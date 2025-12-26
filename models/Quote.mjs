import mongoose from "mongoose";

const quoteSchema = new mongoose.Schema(
  {
    service_name: {
      type: String,
      required: [true, "Service name is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    work_preview_url: {
      type: String,
      match: [/^https?:\/\/.+/i, "Must be a valid URL"],
    },
    photographer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Photographer",
      required: [true, "Photographer ID is required"],
    },
    photographer_share: {
      type: Number,
      required: [true, "Photographer share is required"],
      min: 0,
      max: 100,
    },
    job_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
    },
  },
  {
    timestamps: true,
    collection: "quotes",
  }
);

// Virtual: Photographer Share Amount
quoteSchema.virtual("photographerShareAmount").get(function () {
  return (this.price * this.photographer_share) / 100;
});

// Index
quoteSchema.index({ photographer_id: 1 });
quoteSchema.index({ job_id: 1 });

export default mongoose.model("Quote", quoteSchema);
