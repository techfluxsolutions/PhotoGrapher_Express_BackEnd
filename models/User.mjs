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
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*\.\w{2,}$/i,
        "Please enter a valid email",
      ],
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
// Note: `mobileNumber` is declared with `unique: true` in the schema field — avoid a duplicate single-field index.
userSchema.index({ mobileNumber: 1, verificationId: 1 });
userSchema.index({ otp: 1 });
userSchema.index({ userType: 1 });

export default mongoose.model("User", userSchema);
