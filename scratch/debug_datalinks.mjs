import mongoose from 'mongoose';
import DataLinks from '../models/DataLinks.js';

async function run() {
  await mongoose.connect('mongodb+srv://mohsin:Hire_Roofers@hireroofers.az6w7wp.mongodb.net/photographer?retryWrites=true&w=majority');
  
  const datalinks = await DataLinks.find({
    $or: [
      { bookingid: 'VEROA-BK-000462' },
      { veroaBookingId: 'VEROA-BK-000462' }
    ]
  });

  console.log('Total datalinks found:', datalinks.length);
  datalinks.forEach(d => {
    console.log({
      _id: d._id,
      category: d.category,
      photographerId: d.photographerId,
      key: d.key,
      isPublished: d.isPublished
    });
  });

  process.exit(0);
}

run().catch(console.error);
