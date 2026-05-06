import mongoose from "mongoose";
import Photographer from "./Photographer.mjs";
import PlatformSettings from "./PlatformSettings.mjs";
import ServiceBooking from "./ServiceBookings.mjs";

const payoutSchema = new mongoose.Schema(
  {
    shootType: {
      type: String,
      enum: ["Service", "HourlyShoot", "PhotoEditing"],
      default: "Service",
    },
    photographer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Photographer",
      required: [true, "Photographer ID is required"],
    },
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceBooking",
      required: [true, "Booking ID is required"],
    },
    payout_amount: {
      type: Number, // This might be redundant if we have paid_amount, keeping for backward compatibility or as 'current transaction amount'
      required: false, // Made optional as we are moving to summary model
      min: 0,
    },
    total_amount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: 0,
    },
    paid_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    pending_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Partial", "Paid"],
      default: "Pending",
    },
    photographer_share: {
      type: Number,
      default: 0,
      min: 0,
    },
    payout_status: { // Deprecated/Legacy support
      type: String,
      enum: ["pending", "processed", "failed"],
      default: "pending",
    },
    payout_date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "payouts",
  }
);

// Middleware to calculate photographer_share before saving
payoutSchema.pre("save", async function () {
  try {
    // Only calculate if photographer_share is not already set or total_amount changed
    if (this.isModified("total_amount") || this.photographer_share === 0) {
      // 1. Check if the booking already has a photographerAmount set (from Admin)
      const booking = await ServiceBooking.findById(this.booking_id);
      if (booking && booking.photographerAmount > 0) {
        this.photographer_share = booking.photographerAmount;
        return;
      }

      // 2. Fallback to calculating based on Photographer's expertise level and PlatformSettings
      const photographer = await Photographer.findById(this.photographer_id);
      if (!photographer) {
        throw new Error("Photographer not found");
      }

      const settings = await PlatformSettings.findOne({ type: "commissions" });
      if (!settings) {
        // Fallback to photographer's own commissionPercentage if settings missing
        this.photographer_share = (this.total_amount * (100 - (photographer.commissionPercentage || 0))) / 100;
        return;
      }

      // Determine percentage based on expertise level
      const level = (photographer.professionalDetails?.expertiseLevel || "").toLowerCase();
      let percentage = 0;

      if (level === "initio") {
        percentage = settings.initio;
      } else if (level === "pro") {
        percentage = settings.pro;
      } else if (level === "elite") {
        percentage = settings.elite;
      } else {
        // Default to photographer's own percentage if level not matched
        percentage = photographer.commissionPercentage || 0;
      }

      this.photographer_share = (this.total_amount * (100 - percentage)) / 100;
    }
  } catch (error) {
    throw error;
  }
});

// Virtual: Is Processed?
payoutSchema.virtual("isProcessed").get(function () {
  return this.status === "Paid";
});

// Index
payoutSchema.index({ photographer_id: 1, booking_id: 1 }, { unique: true }); // Ensure one payout summary per booking
payoutSchema.index({ status: 1 });
payoutSchema.index({ payout_date: -1 });

export default mongoose.model("Payout", payoutSchema);
