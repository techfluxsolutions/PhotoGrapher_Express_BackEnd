import mongoose from "mongoose";

const hourlyServiceSchema = new mongoose.Schema(
    {
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

        // array of card Details
        cardDetails: [
            {
                name: {
                    type: String,
                    required: true,
                },
                description: {
                    type: [String]
                },
                image: {
                    type: String,
                    required: true,
                }
            }
        ],
        isPremium: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

export default mongoose.model("HourlyService", hourlyServiceSchema);