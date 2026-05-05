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
        required: true
    },
    folderPath: {
        type: String
    },
    isPublished: {
        type: Boolean,
        default: false
    },
    category: {
        type: String
    }
}, { collection: 'datalinks' });

export default mongoose.model("DataLinks", DataLinksSchema);
