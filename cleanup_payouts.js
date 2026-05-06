import mongoose from "mongoose";
import dotenv from "dotenv";
import Payout from "./models/Payout.mjs";

dotenv.config();

const cleanup = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const payouts = await Payout.find();
    console.log(`Analyzing ${payouts.length} payouts...`);

    let deletedCount = 0;
    for (const payout of payouts) {
      if (!payout.booking_id) {
        await Payout.deleteOne({ _id: payout._id });
        deletedCount++;
        continue;
      }

      // Check if the booking actually exists in the DB
      const bookingExists = await mongoose.model("ServiceBooking").exists({ _id: payout.booking_id });
      if (!bookingExists) {
        await Payout.deleteOne({ _id: payout._id });
        deletedCount++;
      }
    }

    console.log(`Cleanup complete! Deleted ${deletedCount} demo/orphan payout records.`);
    process.exit(0);
  } catch (error) {
    console.error("Cleanup failed:", error);
    process.exit(1);
  }
};

cleanup();
