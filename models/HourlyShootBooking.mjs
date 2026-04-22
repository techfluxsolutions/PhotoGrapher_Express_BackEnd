import mongoose from "mongoose";

const hourlyShootBookingSchema = new mongoose.Schema(
  {
    veroaBookingId: {
      type: String,
      unique: true,
      sparse: true,
    },
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    photographer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Photographer",
      default: null,
    },
    hourlyShootService_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "HourlyShootService",
      required: false,
    },
    date: {
      type: String,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    hours: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: false,
    },
    requirements: {
      type: String,
      default: "",
    },
    photographerAmount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "canceled"],
      default: "pending",
    },
    bookingStatus: {
      type: String,
      enum: ["accepted", "rejected", "pending"],
      default: "pending",
    },
    galleryStatus: {
      type: String,
      enum: ["Upload Pending", "Photos Uploaded"],
      default: "Upload Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Virtual: IST CreatedAt
hourlyShootBookingSchema.virtual("ist_createdAt").get(function () {
  if (!this.createdAt) return "N/A";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(this.createdAt));
});

// Configure to include virtuals
hourlyShootBookingSchema.set("toJSON", { virtuals: true });
hourlyShootBookingSchema.set("toObject", { virtuals: true });

hourlyShootBookingSchema.index({ client_id: 1 });
hourlyShootBookingSchema.index({ photographer_id: 1 });

export default mongoose.model("HourlyShootBooking", hourlyShootBookingSchema);
