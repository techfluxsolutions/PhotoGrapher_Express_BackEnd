import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema({
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true,
        immutable: true
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceBooking",
        required: true,
        immutable: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        immutable: true
    },
    photographerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Photographer",
        sparse: true,
        immutable: true
    },
    issue: {
        type: String,
        required: true
    },
    attachment: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ["open", "in progress", "closed"],
        default: "open"
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
})

export default mongoose.model("Ticket", ticketSchema);
