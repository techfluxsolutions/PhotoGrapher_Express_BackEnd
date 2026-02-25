import mongoose from "mongoose";
import "dotenv/config";
import ServiceBooking from "../models/ServiceBookings.mjs";

const seedBookingStatus = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error("MONGODB_URI not found in .env");
            process.exit(1);
        }

        console.log("Connecting to MongoDB...");
        await mongoose.connect(mongoUri);
        console.log("Connected successfully.");

        console.log("Updating all previous bookings to have bookingStatus: 'pending'...");

        const result = await ServiceBooking.updateMany(
            { bookingStatus: { $exists: false } }, // Update records where field doesn't exist
            { $set: { bookingStatus: "pending" } }
        );

        // Also update any that might be null or empty if they exist but are not set
        const result2 = await ServiceBooking.updateMany(
            { bookingStatus: { $in: [null, ""] } },
            { $set: { bookingStatus: "pending" } }
        );

        console.log(`Update complete.`);
        console.log(`${result.modifiedCount} records updated (where field was missing)`);
        console.log(`${result2.modifiedCount} records updated (where field was null/empty)`);

        process.exit(0);
    } catch (error) {
        console.error("Error seeding booking status:", error);
        process.exit(1);
    }
};

seedBookingStatus();
