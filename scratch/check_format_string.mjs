
import mongoose from 'mongoose';
import ServiceBooking from '../models/ServiceBookings.mjs';

async function checkFormat() {
  await mongoose.connect("mongodb+srv://mohsin:Hire_Roofers@hireroofers.az6w7wp.mongodb.net/photographer?retryWrites=true&w=majority");
  const doc = await ServiceBooking.findOne({
    $or: [
      { startDate: { $exists: true, $ne: null } },
      { eventDate: { $exists: true, $ne: null } }
    ]
  });
  console.log(JSON.stringify(doc, null, 2));
  process.exit();
}
checkFormat();
