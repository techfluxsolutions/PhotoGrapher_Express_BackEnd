import mongoose from "mongoose";
import dotenv from "dotenv";
import Payout from "./models/Payout.mjs";
import ServiceBooking from "./models/ServiceBookings.mjs";

dotenv.config();

const repair = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find all bookings that are accepted and not canceled, and have a photographer
    const bookings = await ServiceBooking.find({
      photographer_id: { $ne: null },
      bookingStatus: "accepted",
      status: { $ne: "canceled" }
    });

    console.log(`Found ${bookings.length} accepted bookings. Checking for payouts...`);

    let createdCount = 0;
    let updatedCount = 0;

    for (const booking of bookings) {
      try {
        const existingPayout = await Payout.findOne({ booking_id: booking._id });
        
        if (!existingPayout) {
          await Payout.create({
            photographer_id: booking.photographer_id,
            booking_id: booking._id,
            total_amount: booking.totalAmount || 0,
            shootType: booking.serviceCategory === "editing" ? "PhotoEditing" : (booking.serviceCategory === "hourly" ? "HourlyShoot" : "Service"),
            status: "Pending",
            payout_date: new Date()
          });
          createdCount++;
        } else {
          // Just trigger save to update share if needed
          await existingPayout.save();
          updatedCount++;
        }
      } catch (err) {
        console.error(`Failed to repair payout for booking ${booking._id}:`, err.message);
      }
    }

    console.log(`Repair complete! Created: ${createdCount}, Updated: ${updatedCount}`);
    process.exit(0);
  } catch (error) {
    console.error("Repair failed:", error);
    process.exit(1);
  }
};

repair();
