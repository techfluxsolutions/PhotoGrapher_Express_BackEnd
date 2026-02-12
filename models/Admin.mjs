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
    mobileNumber: {
      type: String,
      required: false,
      unique: true,
      trim: true,
      sparse: true,
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
    avatar: {
      type: String,
      default: "",
    },
    isAdmin: {
      type: Boolean,
      default: true,
    },
    adminType: {
      type: String,
      enum: ["super_admin", "admin"],
      default: "admin",
    },
    can_verify_photographer: { type: Boolean, default: false },
    can_build_quote: { type: Boolean, default: false },
    can_control_payment: { type: Boolean, default: false },
    can_manage_customer_data: { type: Boolean, default: false },
    can_followup_photographer: { type: Boolean, default: false },
    can_manage_packages: { type: Boolean, default: false },
    can_view_reports: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
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
