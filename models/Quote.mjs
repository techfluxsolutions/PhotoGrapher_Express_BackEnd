import mongoose from "mongoose";

const quoteSchema = new mongoose.Schema(
  {
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    eventDate: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    eventDuration: {
      type: Number,
      required: true,
    },
    photographyRequirements: {
      type: String,
    },
    clientName: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
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
