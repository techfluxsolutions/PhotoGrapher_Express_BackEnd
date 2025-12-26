import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
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
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
    },
    review_text: { type: String },
    review_date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "reviews",
  }
);

// Virtual: Star Rating (as emoji)
reviewSchema.virtual("starRating").get(function () {
  return "⭐".repeat(this.rating);
});

// Index
reviewSchema.index({ user_id: 1, photographer_id: 1, job_id: 1 });
reviewSchema.index({ rating: -1 });

export default mongoose.model("Review", reviewSchema);
