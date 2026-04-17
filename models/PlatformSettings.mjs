import mongoose from "mongoose";

const platformSettingsSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            default: "commissions",
            unique: true
        },
        initio: { type: Number, default: 0, min: 0, max: 100 },
        elite: { type: Number, default: 0, min: 0, max: 100 },
        pro: { type: Number, default: 0, min: 0, max: 100 }
    },
    { timestamps: true }
);

export default mongoose.model("PlatformSettings", platformSettingsSchema);
