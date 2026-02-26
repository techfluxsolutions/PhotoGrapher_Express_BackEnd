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
notificationSchema.pre("validate", function () {
  if (!this.user_id && !this.photographer_id && !this.admin_id) {
    throw new Error(
      "At least one recipient (user, photographer, or admin) must be set"
    );
  }
});

// Virtual: Recipient Type
notificationSchema.virtual("recipientType").get(function () {
  if (this.user_id) return "user";
  if (this.photographer_id) return "photographer";
  if (this.admin_id) return "admin";
  return "unknown";
});

// Virtual: Time Ago
notificationSchema.virtual("time_ago").get(function () {
  if (!this.createdAt) return null;
  const seconds = Math.floor((new Date() - new Date(this.createdAt)) / 1000);
  let interval = Math.floor(seconds / 31536000);

  if (interval > 1) return interval + " years ago";
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) return interval + " months ago";
  interval = Math.floor(seconds / 86400);
  if (interval > 1) return interval + " days ago";
  interval = Math.floor(seconds / 3600);
  if (interval > 1) return interval + " hours ago";
  interval = Math.floor(seconds / 60);
  if (interval > 1) return interval + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
});

// Virtual: IST Time
notificationSchema.virtual("ist_time").get(function () {
  if (!this.createdAt) return null;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(this.createdAt);
});

// Configure to include virtuals
notificationSchema.set("toJSON", { virtuals: true });
notificationSchema.set("toObject", { virtuals: true });


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
