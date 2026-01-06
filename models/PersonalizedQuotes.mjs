import mongoose from "mongoose";

const personalizedQuoteSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    budget: {
      type: Number,
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    eventStartDate: {
      type: Date,
      required: true,
    },
    eventEndDate: {
      type: Date,
      required: true,
    },
    eventCity: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true
    },
  },
  { timestamps: true }
);

personalizedQuoteSchema.index({ user_id: 1 });
personalizedQuoteSchema.index({ user_id: 1, serviceId: 1 });

export default mongoose.model("PersonalizedQuote", personalizedQuoteSchema);
