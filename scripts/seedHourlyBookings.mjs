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

    const dummyHourlyBookings = [
      {
        veroaBookingId: "BK001",
        client_id: user._id,
        service_id: service._id,
        totalAmount: 34387,
        bookingDate: new Date(),
        status: "confirmed",
        bookingStatus: "accepted",
        galleryStatus: "Photos Uploaded",
        flatOrHouseNo: "A-123",
        streetName: "Marine Drive",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        hourlyPackages: [
          {
            category: "Standard",
            hours: "0-3 Hours",
            services: [
              { name: "Videographer", qty: 2, price: 7998 },
              { name: "Photographer", qty: 2, price: 7998 },
              { name: "Lighting Setup", qty: 3, price: 5997 },
              { name: "Editing", qty: 2, price: 2398 },
            ],
          },
          {
            hours: "5 Hours",
            services: [
              { name: "Videographer", qty: 2, price: 11998 },
              { name: "Photographer", qty: 1, price: 5999 },
              { name: "Editing", qty: 4, price: 4796 },
              { name: "Lighting Setup", qty: 1, price: 1999 },
            ],
          },
        ],
      },
      {
        veroaBookingId: "BK002",
        client_id: user._id,
        service_id: service._id,
        totalAmount: 15497,
        bookingDate: new Date(),
        status: "pending",
        bookingStatus: "pending",
        galleryStatus: "Upload Pending",
        flatOrHouseNo: "Plot 45",
        streetName: "Johari Bazar",
        city: "Jaipur",
        state: "Rajasthan",
        postalCode: "302001",
        hourlyPackages: [
          {
            category: "Premium",
            hours: "8 Hours",
            services: [
              { name: "Cinematographer", qty: 1, price: 9999 },
              { name: "Photographer", qty: 1, price: 3999 },
              { name: "Lighting Setup", qty: 1, price: 1499 },
            ],
          },
        ],
      },
    ];

    await ServiceBooking.deleteMany({ veroaBookingId: { $in: ["BK001", "BK002"] } });
    await ServiceBooking.insertMany(dummyHourlyBookings);

    console.log('Successfully seeded 2 dummy hourly bookings');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

seed();
