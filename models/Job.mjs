import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    quote_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quote",
      required: [true, "Quote ID is required"],
    },
    job_name: {
      type: String,
      required: [true, "Job name is required"],
      trim: true,
    },
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer ID is required"],
    },
    date_time: {
      type: Date,
      required: [true, "Date and time is required"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
    },
    duration_hours: {
      type: Number,
      min: 1,
    },
    shoot_requirements: { type: String },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    assigned_photographer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Photographer",
    },
    event_type: { type: String },
  },
  {
    timestamps: true,
    collection: "jobs",
  }
);

// Pre-save hook: auto-set assigned photographer if not set (optional logic)
jobSchema.pre("save", function (next) {
  if (!this.assigned_photographer_id && this.quote_id) {
    // You could populate quote and assign based on rules
    // For now, just allow manual assignment
  }
  next();
});

// Virtual: Is Confirmed?
jobSchema.virtual("isConfirmed").get(function () {
  return this.status === "confirmed";
});

// Index
jobSchema.index({ quote_id: 1 });
jobSchema.index({ customer_id: 1 });
jobSchema.index({ assigned_photographer_id: 1 });
jobSchema.index({ date_time: 1 });
jobSchema.index({ status: 1 });

export default mongoose.model("Job", jobSchema);
