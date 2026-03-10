import mongoose from 'mongoose';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const mongoMatch = env.match(/MONGODB_URI=\s*(.+)/);
const uri = mongoMatch ? mongoMatch[1].trim() : null;

async function findMock() {
  if (!uri) {
    process.exit(1);
  }
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    const booking = await db.collection('servicebookings').findOne({ veroaBookingId: "VEROA-BK-000026" });
    
    if (booking) {
        fs.writeFileSync('mock_search.txt', JSON.stringify(booking, null, 2));
    } else {
        fs.writeFileSync('mock_search.txt', 'Not found');
    }
    
  } catch (err) {
    fs.writeFileSync('mock_search.txt', 'Error: ' + err.message);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}
findMock();
