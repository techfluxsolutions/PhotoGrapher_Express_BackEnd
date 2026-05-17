import mongoose from 'mongoose';
import DataLinks from '../models/DataLinks.js';

async function run() {
  await mongoose.connect('mongodb+srv://mohsin:Hire_Roofers@hireroofers.az6w7wp.mongodb.net/photographer?retryWrites=true&w=majority');
  
  console.log('Connected to MongoDB.');
  
  const result = await DataLinks.updateMany(
    {
      $or: [
        { photographerId: null },
        { photographerId: { $exists: false } }
      ]
    },
    {
      $set: { isPublished: true }
    }
  );

  console.log(`Successfully updated ${result.modifiedCount} client-uploaded datalink records to isPublished: true.`);
  
  process.exit(0);
}

run().catch(console.error);
