import mongoose from "mongoose";

const availabilitySchema = new mongoose.Schema(
  {
    photographer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Photographer",
      required: [true, "Photographer ID is required"],
    },
    available_date: {
      type: Date,
      required: [true, "Available date is required"],
    },
    available_time_start: {
      type: String,
      required: [true, "Start time is required"],
      match: [
        /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Time must be in HH:MM format",
      ],
    },
    available_time_end: {
      type: String,
      required: [true, "End time is required"],
      match: [
        /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Time must be in HH:MM format",
      ],
    },
    is_booked: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "availability",
  }
);

// Pre-save hook: validate time range
availabilitySchema.pre("validate", function (next) {
  if (this.available_time_start >= this.available_time_end) {
    next(new Error("Start time must be before end time"));
  } else {
    next();
  }
});

// Virtual: Time Slot
availabilitySchema.virtual("timeSlot").get(function () {
  return `${this.available_time_start} - ${this.available_time_end}`;
});

// Index
availabilitySchema.index({
  photographer_id: 1,
  available_date: 1,
  available_time_start: 1,
});
availabilitySchema.index({ is_booked: 1 });

export default mongoose.model("Availability", availabilitySchema);
