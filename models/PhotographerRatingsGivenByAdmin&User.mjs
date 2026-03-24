import mongoose from "mongoose"

const PhotographerRatingsGivenByAdminAndUser = mongoose.Schema({
    photographerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Photographer",
        required: true
    },
    rating: {
        type: Number,
        required: true,
        max: 5,
        min: 1
    },
    review: {
        type: String,
        required: true
    },
    ratingGivenBy: {
        type: String,
        enum: ["admin", "user"],
        required: true
    },
    ratingGivenById: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },


}, { timestamps: true })

export default mongoose.model("PhotographerRatingsGivenByAdminAndUser", PhotographerRatingsGivenByAdminAndUser)