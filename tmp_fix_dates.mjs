import mongoose from 'mongoose';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const mongoMatch = env.match(/MONGODB_URI=\s*(.+)/);
const uri = mongoMatch ? mongoMatch[1].trim() : null;

async function fixBrokenDates() {
  if (!uri) {
    process.exit(1);
  }
  
  try {
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
    
    fs.writeFileSync('fix_dates_result.txt', `Fixed ${count} bookings with incorrect date string formats.`);
    
  } catch (err) {
    fs.writeFileSync('fix_dates_result.txt', 'Error: ' + err.message);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}
fixBrokenDates();
