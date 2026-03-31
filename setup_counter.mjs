import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Counter from './models/Counter.mjs';
import ServiceBooking from './models/ServiceBookings.mjs';

dotenv.config();

const uri = process.env.MONGODB_URI;

mongoose.connect(uri)
  .then(async () => {
    // find true max
    const all = await ServiceBooking.find({ veroaBookingId: { $exists: true } });
    let trueMax = 0;
    for(let b of all) {
      if (b.veroaBookingId) {
        let m = parseInt(b.veroaBookingId.split('-').pop(), 10);
        if (m > trueMax) trueMax = m;
      }
    }
    console.log('True max across all:', trueMax);

    // Initialise counter to trueMax
    await Counter.findOneAndUpdate(
      { _id: 'veroaBookingId' },
      { $set: { seq: trueMax } },
      { upsert: true, new: true }
    );
    console.log('Counter initialised to', trueMax);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
