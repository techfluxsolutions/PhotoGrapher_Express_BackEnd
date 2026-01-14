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
            required: true,
        },
        messageType: {
            type: String,
            enum: ["text", "image", "file"],
            default: "text",
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
