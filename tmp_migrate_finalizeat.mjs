import mongoose from 'mongoose';
import fs from 'fs';

// Manually parse env to avoid space issues
const env = fs.readFileSync('.env', 'utf8');
const mongoMatch = env.match(/MONGODB_URI=\s*(.+)/);
const uri = mongoMatch ? mongoMatch[1].trim() : null;

async function migrateFinalizeAt() {
  if (!uri) {
    process.exit(1);
  }
  
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const collection = db.collection('quotes');
    
    // Find quotes with isQuoteFinal: true but finalizeAt is null or missing
    const items = await collection.find({ 
        isQuoteFinal: true, 
        $or: [
            { finalizeAt: null },
            { finalizeAt: { $exists: false } }
        ]
    }).toArray();
    
    console.log(`Found ${items.length} items to migrate`);
    
    let count = 0;
    for (const item of items) {
        // Use updatedAt if available, otherwise createdAt, otherwise current time
        const newDate = item.updatedAt || item.createdAt || new Date();
        await collection.updateOne({ _id: item._id }, { $set: { finalizeAt: newDate } });
        count++;
    }
    
    fs.writeFileSync('migration_result.txt', `Successfully migrated ${count} quotes with null/missing finalizeAt field.`);
    
  } catch (err) {
    fs.writeFileSync('migration_result.txt', 'Error: ' + err.message);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}
migrateFinalizeAt();
