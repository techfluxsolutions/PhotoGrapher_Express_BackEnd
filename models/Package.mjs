import mongoose from "mongoose";

const packageSchema = new mongoose.Schema(
  {
    package_name: {
      type: String,
      required: [true, "Package name is required"],
      trim: true,
    },
    description: { type: String },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    storage_limit_mb: {
      type: Number,
      required: [true, "Storage limit is required"],
      min: 0,
    },
    duration_months: {
      type: Number,
      required: [true, "Duration in months is required"],
      min: 1,
    },
  },
  {
    timestamps: true,
    collection: "packages",
  }
);

// Virtual: Price in INR
packageSchema.virtual("priceINR").get(function () {
  return `₹${this.price}`;
});

// Index
packageSchema.index({ package_name: 1 });
packageSchema.index({ price: 1 });

export default mongoose.model("Package", packageSchema);
