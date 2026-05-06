import mongoose from "mongoose";
import dotenv from "dotenv";
import Payout from "./models/Payout.mjs";
import Photographer from "./models/Photographer.mjs";
import PlatformSettings from "./models/PlatformSettings.mjs";

dotenv.config();

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const payouts = await Payout.find();
    console.log(`Found ${payouts.length} payouts to migrate.`);

    for (const payout of payouts) {
      try {
        await payout.save();
        console.log(`Updated payout for booking: ${payout.booking_id}`);
      } catch (err) {
        console.error(`Failed to update payout for booking ${payout.booking_id}:`, err.message);
      }
    }

    console.log("Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrate();
