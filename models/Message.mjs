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
        flatOrHouseNo: {
            type: String,
            sparse: true,
        },
        streetName: {
            type: String,
            sparse: true,
        },
        city: {
            type: String,
            sparse: true,
        },
        state: {
            type: String,
            sparse: true,
        },
        postalCode: {
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
        clientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            sparse: true,
        },
        requirements: {
            type: [String],
            sparse: true,
        },
        editingPreferences: {
            type: Boolean,
            sparse: true,
        },
        currentBudget: {
            type: String,
            sparse: true,
        },
        previousBudget: {
            type: String,
            sparse: true,
        },
        eventDuration: {
            type: Number,
            sparse: true,
        },
        quoteType: {
            type: String,
            sparse: true,
        },
        phoneNumber: {
            type: String,
            sparse: true,
        },
        email: {
            type: String,
            sparse: true,
        },
        clientName: {
            type: String,
            sparse: true,
        },
        eventDate: {
            type: String,
            sparse: true,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        isAdminRead: {
            type: Boolean,
            default: false,
        },
        isQuoteFinal: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true, collection: "messages" }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

export default mongoose.model("Message", messageSchema);
