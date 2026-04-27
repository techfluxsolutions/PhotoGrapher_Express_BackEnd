import mongoose from "mongoose";

const standardAndPremiumSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true, // Standard / Premium
        },
        hourSection: [
            {
                hours: {
                    type: String,
                },
                description: {
                    type: String,
                },
                pricing: {
                    type: Number,
                },
            },
        ],

        price: {
            type: Number,
            required: true,
        },

        duration: {
            type: String, // 3 Hours, 5 Hours, 8 Hours
        },

        features: [
            {
                type: String,
            },
        ],

        isPopular: {
            type: Boolean,
            default: false,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        images: [
            {
                type: String, // Path to the image
            },
        ],
    },
    { timestamps: true }
);

export default mongoose.model("StandardAndPremium", standardAndPremiumSchema);