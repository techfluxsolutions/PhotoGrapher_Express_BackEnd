import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    mobileNo: {
      type: String,
      required: true,
      unique: true,
    },
    avtar: {
      type: String,
      default: "",
    },
    password: {
      type: String,
    },
    otp: {
      type: String,
    },
    isVerified: {
      type: String,
      default: "Unverified",
    },
    otpExpiresAt: {
      type: Date,
    },
  },

  {
    timestamps: true,
    collection: "users",
  }
);

// Index
userSchema.index({ mobileNo: 1 });
userSchema.index({ otp: 1 });

export default mongoose.model("User", userSchema);
