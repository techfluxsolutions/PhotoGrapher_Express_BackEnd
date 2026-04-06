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
      required: false,
    },
    streetName: {
      type: String,
      required: false,
    },
    landMark: {
      type: String,
      required: false,
    },
    city: {
      type: String,
      required: false,
    },
    state: {
      type: String,
      required: false,
    },
    postalCode: {
      type: String,
      required: false,
    },
    lat: {
      type: Number,
      default: null,
    },
    lng: {
      type: Number,
      default: null,
    },
    address: {
      type: String,
      default: "",
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
    galleryStatus: {
      type: String,
      enum: ["Upload Pending", "Photos Uploaded"],
      default: "Upload Pending",
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
      type: String,
      unique: [true, 'Booking ID already exists'],
      sparse: true
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
    },
    photographerIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Photographer",
      default: []
    }],
    photographerAmount: {
      type: Number,
      default: 0
    },
    expectedGuests: {
      type: String,
      required: false, // this is for the mobile only
    },
    budget: {
      type: String,
      required: false, // this is for the mobile only
    },
    acceptedAt: {
      type: Date,
      default: null
    },
    photosUploadedAt: {
      type: Date,
      default: null
    },
    firstPhotoUploadedAt: {
      type: Date,
      default: null
    },
    fullyPaidAt: {
      type: Date,
      default: null
    },
    bookingOtp: {
      type: String,
      default: null
    },
    otpVerified: {
      type: Boolean,
      default: false
    },
    razorpayOrderId: {
      type: String,
      default: null
    }
  }, { timestamps: true }
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
