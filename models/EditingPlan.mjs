import mongoose from "mongoose";

const editingPlanSchema = new mongoose.Schema({
    numberOfVideos: {
        type: Number,
        required: true["Number of videos is required"]
    },
    subtitle: {
        type: String,
        required: true
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
        enum: ["standard", "premium"],
        required: true
    }
});

export default mongoose.model("EditingPlan", editingPlanSchema);

