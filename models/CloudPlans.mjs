import mongoose from "mongoose";

const cloudPlansSchema = new mongoose.Schema({
    charges: {
        type: Number,
        required: true
    },
    days: {
        type: Number,
    },
    is_paid: {
        type: Boolean,
        default: false
    },
    booking_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceBooking"
    },
    client_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    expiry_date: {
        type: Date,
    } 
})

export default mongoose.model("CloudPlans", cloudPlansSchema);
