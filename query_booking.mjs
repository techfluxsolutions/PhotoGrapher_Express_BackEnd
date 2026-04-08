import mongoose from "mongoose";
import ServiceBooking from "./models/ServiceBookings.mjs";
import dotenv from "dotenv";
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  try {
    const booking = await ServiceBooking.findById("69d62adde39b3ba54579f917");
    console.log(booking);
  } catch(e) {
    console.log("Error:", e);
  }
  mongoose.disconnect();
});
