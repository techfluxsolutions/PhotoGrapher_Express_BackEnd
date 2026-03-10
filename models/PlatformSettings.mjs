import mongoose from "mongoose";

const platformSettingsSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            default: "commissions",
            unique: true
        },
        initio: { type: Number, default: 0 },
        elite: { type: Number, default: 0 },
        pro: { type: Number, default: 0 }
    },
    { timestamps: true }
);

export default mongoose.model("PlatformSettings", platformSettingsSchema);
