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

    // Admin flag (if needed for admin bypass flows)
    isAdmin: {
      type: Boolean,
      default: false,
    },

    fcmToken: {
      type: String,
      default: null,
    },

    userType: {
      type: String,
      enum: ["user", "photographer"],
      default: "user",
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

// Indexes
// Note: `mobileNumber` is declared with `unique: true` in the schema field — avoid a duplicate single-field index.
userSchema.index({ mobileNumber: 1, verificationId: 1 });
userSchema.index({ otp: 1 });
userSchema.index({ userType: 1 });

export default mongoose.model("User", userSchema);
