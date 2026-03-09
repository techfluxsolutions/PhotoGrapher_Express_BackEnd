import mongoose from "mongoose";

const DataLinksSchema = new mongoose.Schema({
    dataLink: {
        type: String
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    photographerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    bookingid: {
        type: String
    },
    veroaBookingId: {
        type: String
    }
})

export default mongoose.model("DataLinks", DataLinksSchema);
