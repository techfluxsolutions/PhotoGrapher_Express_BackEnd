import mongoose from "mongoose";
const serviceBookingSchema = new mongoose.Schema(
  {
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bookingDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "canceled"],
      default: "pending",
    },
    flatOrHouseNo: {
      type: String,
      required: true,
    },
    streetName: {
      type: String,
      required: true,
    },
    landMark: {
      type: String,
      required: false,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    postalCode: {
      type: String,
      required: true,
    },
    totalAmount: {
      type: Number,
    },
  },
  { timestamps: true }
);
serviceBookingSchema.index({ service_id: 1 });
serviceBookingSchema.index({ client_id: 1 });

export default mongoose.model("ServiceBooking", serviceBookingSchema);
