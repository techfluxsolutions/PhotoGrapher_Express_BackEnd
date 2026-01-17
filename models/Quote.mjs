import mongoose from "mongoose";
const quoteSchema = new mongoose.Schema(
  {
    service_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
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
    quoteStatus: {
      type: String,
      enum: ["yourQuotes", "upcommingBookings", "previousBookings"],
      default: "yourQuotes"
    }
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
