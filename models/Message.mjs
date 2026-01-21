import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Conversation",
            required: true,
        },
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        message: {
            type: String,
            sparse: true,
        },
        messageType: {
            type: String,
            enum: ["text", "image", "file", "paymentCard"],
            default: "text",
        },
        eventType: {
            type: String,
            sparse: true,
        },
        startDate: {
            type: String,
            sparse: true,
        },
        endDate: {
            type: String,
            sparse: true,
        },
        location: {
            type: String,
            sparse: true,
        },
        budget: {
            type: String,
            sparse: true,
        },
        quoteId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Quote",
            sparse: true,
        },
        attachmentUrl: {
            type: String,
            default: null,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true, collection: "messages" }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

export default mongoose.model("Message", messageSchema);
