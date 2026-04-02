import mongoose from "mongoose";

const cloudPlansSchema = new mongoose.Schema({
    charges: {
        type: Number,
        required: true
    },
    days: {
        type: Number,
        required: true
    }
}, { timestamps: true })

export default mongoose.model("CloudPlans", cloudPlansSchema);
