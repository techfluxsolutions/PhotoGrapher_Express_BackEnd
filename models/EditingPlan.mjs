import mongoose from "mongoose";

const editingPlanSchema = new mongoose.Schema({
    numberOfVideos: {
        type: String, // Changed to String to allow "1-2 Videos"
        required: [true, "Number of videos is required"]
    },
    subtitle: {
        type: String,
        required: false
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
        default: []
    },
    planCategory: {
        type: String,
        enum: ["standard", "premium"],
        required: true
    }
});

export default mongoose.model("EditingPlan", editingPlanSchema);

