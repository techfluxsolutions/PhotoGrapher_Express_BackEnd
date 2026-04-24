import mongoose from "mongoose";

const editingPlanSchema = new mongoose.Schema({
    numberOfVideos: {
        type: Number,
        required: [true, "Number of videos is required"]
    },
    subtitle: {
        type: String,
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
    },
    planCategory: {
        type: String,
        enum: ["standard", "premium"],
        required: [true, "Plan category is required (standard or premium)"],
        lowercase: true
    }
});

export default mongoose.model("EditingPlan", editingPlanSchema);

