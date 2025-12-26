import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
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
    can_verify_photographer: { type: Boolean, default: false },
    can_build_quote: { type: Boolean, default: false },
    can_control_payment: { type: Boolean, default: false },
    can_manage_customer_data: { type: Boolean, default: false },
    can_followup_photographer: { type: Boolean, default: false },
    can_manage_packages: { type: Boolean, default: false },
    can_view_reports: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "admins",
  }
);

// Virtual: Full Name
adminSchema.virtual("fullName").get(function () {
  return `${this.name}`;
});

// Index
adminSchema.index({ username: 1, email: 1 });

export default mongoose.model("Admin", adminSchema);
