import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    photographer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Photographer",
    },
    admin_id: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
    job_id: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
    notification_type: {
      type: String,
      required: [true, "Notification type is required"],
      enum: ["job_update", "payment", "review", "system", "reminder"],
    },
    notification_message: {
      type: String,
      required: [true, "Notification message is required"],
    },
    sent_at: {
      type: Date,
      default: Date.now,
    },
    read_status: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "notifications",
  }
);

// Pre-save hook: ensure at least one recipient is set
notificationSchema.pre("validate", function (next) {
  if (!this.user_id && !this.photographer_id && !this.admin_id) {
    next(
      new Error(
        "At least one recipient (user, photographer, or admin) must be set"
      )
    );
  } else {
    next();
  }
});

// Virtual: Recipient Type
notificationSchema.virtual("recipientType").get(function () {
  if (this.user_id) return "user";
  if (this.photographer_id) return "photographer";
  if (this.admin_id) return "admin";
  return "unknown";
});

// Index
notificationSchema.index({
  user_id: 1,
  photographer_id: 1,
  admin_id: 1,
  job_id: 1,
});
notificationSchema.index({ read_status: 1 });
notificationSchema.index({ sent_at: -1 });

export default mongoose.model("Notification", notificationSchema);
