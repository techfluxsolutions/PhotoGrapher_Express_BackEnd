import mongoose from "mongoose";

const VeroaInvoiceSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client"
    },
    invoiceId: {
        type: String,
        required: true
    },
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking"
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "paid", "failed"],
        default: "pending"
    }
})

const VeroaInvoice = mongoose.model("VeroaInvoice", VeroaInvoiceSchema);

export default VeroaInvoice;