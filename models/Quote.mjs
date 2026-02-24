import mongoose from "mongoose";
const quoteSchema = new mongoose.Schema(
  {
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      sparse: true
    },
    eventType: {
      type: String,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    eventDate: {
      type: Date,
      sparse: true,
    },
    location: {
      type: String,
      required: true,
    },
    eventDuration: {
      type: Number,
      sparse: true,
    },
    photographyRequirements: {
      type: String,
    },
    clientName: {
      type: String,
      sparse: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    phoneNumber: {
      type: String,
      sparse: true,
    },
    email: {
      type: String,
      sparse: true,
    },
    budget: {
      type: String,
    },
    requirements: {
      type: [String],
      required: false
    },
    editingPreferences: {
      type: Boolean,
      default: false
    },
    quoteType: {
      type: String,
      enum: ["quotes", "personalizedQuotes"],
      default: "quotes"
    },
    isQuoteFinal: {
      type: Boolean,
      default: false
    },
    flatOrHouseNo: {
      type: String,
      default: ""
    },
    streetName: {
      type: String,
      default: ""
    },
    city: {
      type: String,
      default: ""
    },
    state: {
      type: String,
      default: ""
    },
    postalCode: {
      type: String,
      default: ""
    },
    currentBudget: {
      type: String,
      default: ""
    },
    previousBudget: {
      type: String,
      default: ""
    },

  },
  {
    timestamps: true,
    collection: "quotes",
  }
);

// Virtual: Photographer Share Amount
quoteSchema.virtual("photographerShareAmount").get(function () {
  return (this.price * this.photographer_share) / 100;
});

// Index
quoteSchema.index({ photographer_id: 1 });
quoteSchema.index({ job_id: 1 });

export default mongoose.model("Quote", quoteSchema);
