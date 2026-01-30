const mongoose = require("mongoose");
const { onboardingSchema } = require('./schemas');

const employerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    // roofer friends for chat

    rooferFriends: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: []
    },

    // Simplified Onboarding Data
    onboarding: { type: onboardingSchema, default: () => ({}) },

    // System Fields
    stripeCustomerId: { type: String },
    isSubscribed: { type: Boolean, default: false },

    // Notification Settings (Direct fields)
    notifications: { type: Boolean, default: true },
    emailUpdates: { type: Boolean, default: true },

    // Location coordinates (GeoJSON format for geospatial queries)
    location: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: {
        type: [Number] // [longitude, latitude]
      }
    },

    // Onboarding Progress
    onboardingCompleted: {
      type: Boolean,
      default: false
    },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for efficient queries
employerSchema.index({ onboardingCompleted: 1 });

// Geospatial index for location-based queries (sparse index - only for documents with location)
employerSchema.index({ 'location.coordinates': '2dsphere' }, { sparse: true });

// Virtual field for latitude (for easier access)
employerSchema.virtual('latitude').get(function () {
  return this.location?.coordinates?.[1];
});

// Virtual field for longitude (for easier access)
employerSchema.virtual('longitude').get(function () {
  return this.location?.coordinates?.[0];
});

// Virtual field for onboarding percentage
employerSchema.virtual('onboardingPercentage').get(function () {
  if (this.onboardingCompleted) return 100;

  const onboarding = this.onboarding || {};
  const profileFields = [
    'companyName', 'businessType', 'abn', 'licenseNumber',
    'contactName', 'email', 'phone', 'suburb', 'postalCode'
  ];

  const filledProfileFields = profileFields.filter(field => onboarding[field]);

  // Total 10 milestones: 9 profile fields + 1 payment completion
  let totalFilled = filledProfileFields.length;
  if (onboarding.paymentStatus === 'completed') {
    totalFilled += 1;
  }

  const percentage = Math.round((totalFilled / 10) * 100);

  return Math.min(100, percentage);
});

// Method to calculate distance to another point (in kilometers)
employerSchema.methods.distanceTo = function (latitude, longitude) {
  if (!this.location?.coordinates) return null;

  const [lon1, lat1] = this.location.coordinates;
  const lat2 = latitude;
  const lon2 = longitude;

  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// Method to complete onboarding (called after payment verification)
employerSchema.methods.completeOnboarding = function () {
  this.onboardingCompleted = true;
  this.completedAt = new Date();
};

employerSchema.methods.isOnboardingComplete = function () {
  return this.onboardingCompleted;
};

module.exports = mongoose.model("Employer", employerSchema);
