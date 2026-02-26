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
      sparse: true,
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
    bookingStatus: {
      type: String,
      enum: ["accepted", "rejected", "pending"],
      default: "pending",
    },
    paymentDate: {
      type: String,
      default: ""
    },
    paymentMode: {
      type: String,
      enum: ["cash", "online", "NA"],
      default: "NA"
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
    eventDate: {
      type: String,
      sparse: true
    },
    startDate: {
      type: String,
      sparse: true
    },
    endDate: {
      type: String,
      sparse: true
    },
    is_Incomplete: {
      type: Boolean,
      default: false
    },
    ratingsGivenByClient: {
      type: Number,
      default: 0
    },
    bookingSource: {
      type: String,
      default: "plain"
    },
    quoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quote",
      default: null,
      sparse: true
    }
  },
  { timestamps: true }
);

// Virtual: IST Booking Date
serviceBookingSchema.virtual("ist_bookingDate").get(function () {
  if (!this.bookingDate) return "N/A";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(this.bookingDate));
});

// Virtual: IST CreatedAt
serviceBookingSchema.virtual("ist_createdAt").get(function () {
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
serviceBookingSchema.set("toJSON", { virtuals: true });
serviceBookingSchema.set("toObject", { virtuals: true });

serviceBookingSchema.index({ service_id: 1 });
serviceBookingSchema.index({ client_id: 1 });

export default mongoose.model("ServiceBooking", serviceBookingSchema);
