import mongoose from 'mongoose';
import fs from 'fs';

// Manually parse env to avoid space issues
const env = fs.readFileSync('.env', 'utf8');
const mongoMatch = env.match(/MONGODB_URI=\s*(.+)/);
const uri = mongoMatch ? mongoMatch[1].trim() : null;

async function dropIndices() {
  if (!uri) {
    fs.writeFileSync('result.txt', 'No URI found');
    process.exit(1);
  }
  
  let log = "";
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const collection = db.collection('conversations');
    
    // Ensure we are in the right DB context (the collection might be different if Mongoose prepends something)
    // But usually 'conversations' matches the collection: "conversations" in schema
    
    // Drop unique indices on bookingId and quoteId
    const toDrop = ['bookingId_1', 'quoteId_1'];
    
    for (const name of toDrop) {
        try {
            await collection.dropIndex(name);
            log += `Dropped index: ${name}\n`;
        } catch (e) {
            log += `Index ${name} not found or error: ${e.message}\n`;
        }
    }
    
    fs.writeFileSync('result.txt', log || "Completed with no actions");
    
  } catch (err) {
    fs.writeFileSync('result.txt', 'Error: ' + err.message);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}
dropIndices();
