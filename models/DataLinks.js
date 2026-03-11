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
    },
    key: {
        type: String,
        required: true,
        index: true
    }
})

export default mongoose.model("DataLinks", DataLinksSchema);
