import mongoose from "mongoose";

const platformSettingsSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            default: "commissions",
            unique: true
        },
        basic: { type: Number, default: 0 },
        intermediate: { type: Number, default: 0 },
        professional: { type: Number, default: 0 }
    },
    { timestamps: true }
);

export default mongoose.model("PlatformSettings", platformSettingsSchema);
