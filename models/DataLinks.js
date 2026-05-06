import mongoose from "mongoose";

const DataLinksSchema = new mongoose.Schema({
    dataLink: {
        type: String
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    photographerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    bookingid: {
        type: String,
        index: true
    },
    veroaBookingId: {
        type: String,
        index: true
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

// Compound index for booking + category/type filters
DataLinksSchema.index({ bookingid: 1, photographerId: 1 });
DataLinksSchema.index({ veroaBookingId: 1, photographerId: 1 });

export default mongoose.model("DataLinks", DataLinksSchema);
