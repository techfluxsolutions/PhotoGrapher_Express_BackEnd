import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.log('No MongoDB URI found in .env');
  process.exit(1);
}

mongoose.connect(uri)
  .then(async () => {
    const db = mongoose.connection.db;
    const result = await db.collection('servicebookings').aggregate([
      { $match: { veroaBookingId: { $exists: true, $ne: null } } },
      { $group: { _id: '$veroaBookingId', count: { $sum: 1 }, ids: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();
    console.log('Duplicates found:', JSON.stringify(result, null, 2));

    // Optional: Let's also find all of these documents to see what their status is
    if (result.length > 0) {
      const idsToFetch = result.flatMap(r => r.ids);
      const docs = await db.collection('servicebookings').find({ _id: { $in: idsToFetch } }).toArray();
      console.log('Documents Details:', JSON.stringify(docs.map(d => ({ _id: d._id, veroaBookingId: d.veroaBookingId, createdAt: d.createdAt, status: d.status })), null, 2));
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
