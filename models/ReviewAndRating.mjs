import mongoose from "mongoose";

const reviewAndRatingSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        immutable: true
    },
    photographerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Photographer",
        sparse: true,
        immutable: true
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceBooking",
        required: true,
        immutable: true
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true,
        immutable: true
    },
    ratingCount: {
        type: Number,
        default: 10
    },
    rateComments: {
        type: String,
        sparse: true
    }
})

export default mongoose.model("ReviewAndRating", reviewAndRatingSchema);
