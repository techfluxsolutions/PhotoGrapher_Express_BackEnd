import mongoose from 'mongoose';
import fs from 'fs';

// Manually parse env to avoid space issues
const env = fs.readFileSync('.env', 'utf8');
const mongoMatch = env.match(/MONGODB_URI=\s*(.+)/);
const uri = mongoMatch ? mongoMatch[1].trim() : null;

async function checkQuotes() {
  if (!uri) {
    process.exit(1);
  }
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const collection = db.collection('quotes');
    
    const count = await collection.countDocuments({ isQuoteFinal: true });
    const missing = await collection.countDocuments({ isQuoteFinal: true, finalizeAt: { $exists: false } });
    const nulls = await collection.countDocuments({ isQuoteFinal: true, finalizeAt: null });
    
    fs.writeFileSync('db_check.txt', `Total Final Quotes: ${count}\nMissing finalizeAt: ${missing}\nNull finalizeAt: ${nulls}`);
    
  } catch (err) {
    fs.writeFileSync('db_check.txt', 'Error: ' + err.message);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}
checkQuotes();
