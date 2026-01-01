import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },

    mobileNumber: {
      type: String,
      required: true,
      unique: true,
    },

    avatar: {
      type: String,
      default: "",
    },

    password: {
      type: String,
    },

    otp: {
      type: String,
    },

    otpExpiresAt: {
      type: Date,
    },

    // Use boolean verified flag for simplicity
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Provider verification fields
    verificationId: {
      type: String,
      default: null,
    },

    verificationExpiry: {
      type: Date,
      default: null,
    },
    fcmToken: {
      type: String,
      default: null,
    },

    userType: {
      type: String,
      enum: ["user", "photographer", "admin"],
      default: "user",
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

// Indexes
userSchema.index({ mobileNumber: 1 });
userSchema.index({ otp: 1 });
userSchema.index({ userType: 1 });

export default mongoose.model("User", userSchema);
