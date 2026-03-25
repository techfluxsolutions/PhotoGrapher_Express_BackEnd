import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const ServiceBookingSchema = new mongoose.Schema({}, { timestamps: true });
const ServiceBooking = mongoose.model("ServiceBooking", ServiceBookingSchema, "servicebookings");

async function findOld() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const oldest = await ServiceBooking.findOne().sort({ createdAt: 1 });
        const newest = await ServiceBooking.findOne().sort({ createdAt: -1 });
        console.log("Oldest booking:", oldest?._id, oldest?.createdAt);
        console.log("Newest booking:", newest?._id, newest?.createdAt);
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

findOld();
