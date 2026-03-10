import mongoose from 'mongoose';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const mongoMatch = env.match(/MONGODB_URI=\s*(.+)/);
const uri = mongoMatch ? mongoMatch[1].trim() : null;

async function checkData() {
  if (!uri) {
    process.exit(1);
  }
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const collection = db.collection('servicebookings');
    
    // Find a few bookings to see their structure
    const bookings = await collection.find({}).sort({ createdAt: -1 }).limit(5).toArray();
    
    fs.writeFileSync('bookings_sample.json', JSON.stringify(bookings, null, 2));
    
  } catch (err) {
    fs.writeFileSync('bookings_sample.json', 'Error: ' + err.message);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}
checkData();
