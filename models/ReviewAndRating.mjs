// import mongoose from "mongoose";

// const reviewAndRatingSchema = new mongoose.Schema({
//     clientId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User",
//         required: true,
//         immutable: true
//     },
//     photographerId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Photographer",
//         sparse: true,
//         immutable: true
//     },
//     bookingId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "ServiceBooking",
//         required: true,
//         immutable: true
//     },
//     serviceId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "Service",
//         required: true,
//         immutable: true
//     },
//     ratingCount: {
//         type: Number,
//         default: 10
//     },
//     rateComments: {
//         type: String,
//         sparse: true
//     }
// })

// export default mongoose.model("ReviewAndRating", reviewAndRatingSchema);


import mongoose from "mongoose";

const reviewAndRatingSchema = new mongoose.Schema({
    createdBy: {
        type: String,
        enum: ["admin", "user"],
        required: true
    },

    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        immutable: true,
        required: function () {
            return this.createdBy === "user";
        }
    },

    photographerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Photographer",
        immutable: true,
        required: function () {
            return this.createdBy === "admin";
        }
    },

    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceBooking",
        immutable: true,
        required: function () {
            return this.createdBy === "user";
        }
    },

    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        immutable: true,
        required: function () {
            return this.createdBy === "user";
        }
    },

    ratingCount: {
        type: Number,
        default: 10,
        min: 1,
        max: 5
    },

    rateComments: {
        type: String
    }
}, { timestamps: true });

export default mongoose.model("ReviewAndRating", reviewAndRatingSchema);