import mongoose from "mongoose";

const testimonialSchema = new mongoose.Schema(
  {
    testimonial: {
      type: String,
      required: true,
    },
    serviceName: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Services",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    rating: {
      type: Number,
      max: 5,
      min: 1,
      required: true,
    },
  },

  {
    timestamps: true,
  }
);
// Index
testimonialSchema.index({ userId: 1 });
testimonialSchema.index({ serviceName: 1 });

export default mongoose.model("Testimonial", testimonialSchema);
