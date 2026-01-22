import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
    {
        quoteId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Quote",
            required: false,
            unique: true,
            sparse: true,
        },
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ServiceBooking",
            required: false,
            unique: true,
            sparse: true,
        },
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],
        lastMessage: {
            type: String,
            default: "",
        },
        lastMessageAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true, collection: "conversations" }
);

conversationSchema.index({ bookingId: 1 });
conversationSchema.index({ participants: 1 });

export default mongoose.model("Conversation", conversationSchema);
