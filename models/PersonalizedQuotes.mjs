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
      sparse: true
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
  },
  { timestamps: true }
);

personalizedQuoteSchema.index({ user_id: 1 });
personalizedQuoteSchema.index({ user_id: 1, serviceId: 1 });

export default mongoose.model("PersonalizedQuote", personalizedQuoteSchema);
