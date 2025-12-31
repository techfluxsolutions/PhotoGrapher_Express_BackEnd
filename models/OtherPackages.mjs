// models/OtherPackages.js
import mongoose from "mongoose";

const otherPackagesSchema = new mongoose.Schema({
  packageTitle: {
    type: String,
    required: true,
  },
  packagePrice: {
    type: Number,
    required: true,
  },
  packageDescriptions: {
    type: [String],
  }
}, { timestamps: true });

export default mongoose.model("OtherPackages", otherPackagesSchema);