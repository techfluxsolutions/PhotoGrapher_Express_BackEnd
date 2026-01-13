import mongoose from "mongoose";

const adminEmailAuthSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*\.\w{2,}$/i,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "admin_email_auth",
  }
);

// Index for faster lookups
adminEmailAuthSchema.index({ email: 1 });

export default mongoose.model("AdminEmailAuth", adminEmailAuthSchema);
