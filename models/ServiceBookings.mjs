import mongoose from "mongoose";
const serviceBookingSchema = new mongoose.Schema(
  {
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    additionalServicesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdditionalServices",
      required: false,
    },
    client_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    photographer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Photographer", // Assuming Photographer model is used for photographer roles or User if unified
      default: null,
    },
    bookingDate: {
      type: Date,
      required: true,
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
    shootType: {
      type: String,
      required: false,
    },
    team: {
      type: String,
      required: false,
    },
    notes: {
      type: String,
      required: false,
    },
    totalAmount: {
      type: Number,
    },
    partial_Payment: {
      type: Boolean,
      default: false
    },
    full_Payment: {
      type: Boolean,
      default: false
    },
    outStandingAmount: {
      type: Number,
      default: 0
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "partially paid", "fully paid"],
      default: "pending"
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "canceled"],
      default: "pending",
    },
    paymentDate: {
      type: String,
      default: ""
    },
    paymentMode: {
      type: String,
      enum: ["cash", "online", "other"],
      default: "other"
    },
    cancellationCharge: {
      type: String,
      default: ""
    },
    cancellationDate: {
      type: String,
      default: ""
    },
    veroaBookingId: {
      type: String
    },
    cancellationReason: {
      type: String,
      default: ""
    },
  },
  { timestamps: true }
);
serviceBookingSchema.index({ service_id: 1 });
serviceBookingSchema.index({ client_id: 1 });

export default mongoose.model("ServiceBooking", serviceBookingSchema);
