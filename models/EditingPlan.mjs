import mongoose from "mongoose";

const editingPlanSchema = new mongoose.Schema({
    numberOfVideos: {
        type: Number,
        required: true["Number of videos is required"]
    },
    planName: {
        type: String,
        required: true,
        trim: true,
    },
    price: {
        type: Number,
        required: true
    },
    features: {
        type: Array,
        required: true
    },
    planCategory: {
        type: String,
        required: true
    }
});

export default mongoose.model("EditingPlan", editingPlanSchema);

