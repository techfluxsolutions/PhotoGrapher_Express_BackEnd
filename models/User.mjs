import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
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
      default: "https://api-photographer.techfluxsolutions.com/uploads/userProfile/NoProfileImg.png",
    },

    password: {
      type: String,
    },

    otp: {
      type: String,
    },
    dateOfBirth: {
      type: String,
    },
    email: {
      type: String,
      unique: true,  // Enforce uniqueness
      sparse: true,  // Allow multiple docs to skip this field (null/missing)

    },
    state: {
      type: String,
      default: ""
    },
    city: {
      type: String,
      default: ""
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
    // OTP Security Fields
    otpAttempts: {
      type: Number,
      default: 0
    },
    lockUntil: {
      type: Date
    },
    lastOtpSentAt: {
      type: Date
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

// Indexes
// Note: `mobileNumber` is declared with `unique: true` in the schema field — avoid a duplicate single-field index.
// userSchema.index({ mobileNumber: 1, verificationId: 1 });
// userSchema.index({ otp: 1 });
// userSchema.index({ userType: 1 });

export default mongoose.model("User", userSchema);
