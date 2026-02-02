
import mongoose from "mongoose";

const gallerySchema = new mongoose.Schema(
    {
        booking_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ServiceBooking",
            required: true,
            unique: true, // Ensure one gallery per booking
        },
        gallery: {
            type: [String],
            default: [],
        },
        isShared: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Gallery", gallerySchema);
