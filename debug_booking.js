import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const ServiceBookingSchema = new mongoose.Schema({
    firstPhotoUploadedAt: Date,
    fullyPaidAt: Date,
}, { timestamps: true });

const ServiceBooking = mongoose.model("ServiceBooking", ServiceBookingSchema, "servicebookings");

async function check() {
    try {
        console.log("Connecting to:", process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        const bookingId = "69c287be350efffd2ed756e7"; // Updated to recent one from user prompt 165
        const booking = await ServiceBooking.findById(bookingId);
        console.log("Booking ID:", bookingId);
        if (booking) {
            console.log("createdAt:", booking.createdAt);
            console.log("firstPhotoUploadedAt:", booking.firstPhotoUploadedAt);
            console.log("fullyPaidAt:", booking.fullyPaidAt);
            console.log("current time:", new Date());
        } else {
            console.log("Booking not found");
        }
        process.exit();
    } catch (e) {
        console.error("Error connecting:", e);
        process.exit(1);
    }
}

check();
