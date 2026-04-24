import mongoose from "mongoose";

const pricingOptionSchema = new mongoose.Schema({
    durationText: { type: String, required: true }, // e.g., "3 Hours", "5 Hours", "8 Hours"
    durationValue: { type: Number }, // e.g., 3, 5, 8
    price: { type: Number, required: true },
    subtitle: { type: String, spare: true, trim: true }
});

const teamShootPlanSchema = new mongoose.Schema({
    teamCategory: {
        type: String,
        enum: ["standard", "premium"],
        required: true
    },
    role: {
        type: String,
        default: "Photographer"
    }, // e.g., "Photographer", "Videographer", "Cinematographer", "Lighting Setup", "Editing"
    pricingType: {
        type: String,
        enum: ["fixed", "duration_based", "duration"],
        required: true
    },
    pricingOptions: [pricingOptionSchema], // Used if pricingType is duration_based
    fixedPrice: { type: Number }, // Used if pricingType is fixed
    features: [{ type: String }],
    isBaseIncluded: { type: Boolean, default: false } // indicates if this is pre-selected by default
}, { timestamps: true });

export default mongoose.model("TeamShootPlan", teamShootPlanSchema);
