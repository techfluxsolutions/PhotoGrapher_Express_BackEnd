import mongoose from "mongoose";

const photographerSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    mobileNumber: {
      type: String,
      required: [true, "Mobile number is required"],
      unique: true,
      trim: true,
      lowercase: true,
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
    isPhotographer: {
      type: Boolean,
      default: true,
    },
    // bank_account_holder: {
    //   type: String,
    //   required: [true, "Bank account holder name is required"],
    // },
    // bank_account_number: {
    //   type: String,
    //   required: [true, "Bank account number is required"],
    //   match: [/^\d+$/, "Account number must contain only digits"],
    // },
    // bank_ifsc: {
    //   type: String,
    //   required: [true, "IFSC code is required"],
    //   match: [/^[A-Za-z]{4}\d{7}$/, "Invalid IFSC code format"],
    // },
    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "pending",
    },
    // storage_used_mb: {
    //   type: Number,
    //   default: 0,
    //   min: 0,
    // },
    calendar_availability: {
      type: String, // JSON string or URL to external calendar
      default: "{}",
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  {
    timestamps: true,
    collection: "photographers",
  }
);

// Virtual: Full Name
photographerSchema.virtual("fullName").get(function () {
  return `${this.name}`;
});

// Index
// photographerSchema.index({ username: 1, email: 1, phone_number: 1 });
photographerSchema.index({ status: 1 });

export default mongoose.model("Photographer", photographerSchema);
