import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ServiceBooking from '../models/ServiceBookings.mjs';
import User from '../models/User.mjs';
import Service from '../models/Service.mjs';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/photographer";

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find a user and a service
    const user = await User.findOne();
    const service = await Service.findOne();

    if (!user || !service) {
      console.error('Error: Need at least one User and one Service in DB to seed bookings.');
      process.exit(1);
    }

    const dummyEditingBookings = [
      {
        veroaBookingId: "ED001",
        client_id: user._id,
        service_id: service._id,
        totalAmount: 12500,
        bookingDate: new Date(),
        status: "confirmed",
        editingPackages: [
          {
            planName: "Cinematic Wedding Edit",
            category: "Standard",
            videos: 2,
            price: 5000,
          },
          {
            planName: "Social Media Teaser",
            category: "Premium",
            videos: 1,
            price: 2500,
          },
        ],
      },
      {
        veroaBookingId: "ED002",
        client_id: user._id,
        service_id: service._id,
        totalAmount: 15000,
        bookingDate: new Date(),
        status: "pending",
        editingPackages: [
          {
            planName: "Full Event Montage",
            category: "Premium",
            videos: 3,
            price: 15000,
          },
        ],
      },
    ];

    await ServiceBooking.deleteMany({ veroaBookingId: { $in: ["ED001", "ED002"] } });
    await ServiceBooking.insertMany(dummyEditingBookings);

    console.log('Successfully seeded 2 dummy editing bookings');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

seed();
