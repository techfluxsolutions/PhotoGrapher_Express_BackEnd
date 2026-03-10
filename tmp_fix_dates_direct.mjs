import mongoose from 'mongoose';
import fs from 'fs';

const uri = "mongodb+srv://mohsin:Hire_Roofers@hireroofers.az6w7wp.mongodb.net/photographer?retryWrites=true&w=majority";

async function fixBrokenDates() {
  try {
    console.log("Connecting...");
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const collection = db.collection('servicebookings');
    
    const bookings = await collection.find({}).toArray();
    console.log(`Checking ${bookings.length} bookings...`);
    
    let count = 0;
    for (const booking of bookings) {
      const updateData = {};
      let needsFix = false;

      // Check if dates look like "Tue Mar 10..."
      const dateRegex = /^[A-Z][a-z]{2}\s[A-Z][a-z]{2}\s\d{2}\s\d{4}/;

      if (booking.startDate && (dateRegex.test(booking.startDate) || booking.startDate.includes('GMT'))) {
        try {
          updateData.startDate = new Date(booking.startDate).toISOString().split('T')[0];
          needsFix = true;
        } catch (e) {}
      }

      if (booking.endDate && (dateRegex.test(booking.endDate) || booking.endDate.includes('GMT'))) {
        try {
          updateData.endDate = new Date(booking.endDate).toISOString().split('T')[0];
          needsFix = true;
        } catch (e) {}
      }

      if (needsFix) {
        await collection.updateOne({ _id: booking._id }, { $set: updateData });
        count++;
        console.log(`Fixed booking ${booking.veroaBookingId}`);
      }
    }
    console.log(`Fixed ${count} bookings.`);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}
fixBrokenDates();
