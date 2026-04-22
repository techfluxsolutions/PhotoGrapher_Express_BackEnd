
import mongoose from 'mongoose';
import ServiceBooking from '../models/ServiceBookings.mjs';
import User from '../models/User.mjs';
import Service from '../models/Service.mjs';

const hourlyData = [
  {
    bookingId: "BK007",
    clientName: "Sneha Kapoor",
    eventAddress: "Chandigarh, Punjab",
    assignedPhotographer: "Arjun Reddy",
    galleryStatus: "Upload Pending",
    bookingStatus: "confirmed",
    hourlyPackages: [
      {
        category: "Premium",
        hours: "10 Hours",
        eventDate: "2026-05-20",
        eventTime: "08:00 - 18:00",
        services: [
          { name: "Photographer", qty: 2, price: 15000 },
          { name: "Videographer", qty: 2, price: 20000 },
          { name: "Drone", qty: 1, price: 8000 }
        ],
      }
    ],
  },
  {
    bookingId: "BK008",
    clientName: "Aditya Verma",
    eventAddress: "Lucknow, UP",
    assignedPhotographer: "",
    galleryStatus: "Upload Pending",
    bookingStatus: "pending",
    hourlyPackages: [
      {
        category: "Standard",
        hours: "3 Hours",
        eventDate: "2026-05-22",
        eventTime: "17:00 - 20:00",
        services: [
          { name: "Photographer", qty: 1, price: 4500 }
        ],
      }
    ],
  },
  {
    bookingId: "BK009",
    clientName: "Priya Das",
    eventAddress: "Kolkata, West Bengal",
    assignedPhotographer: "Siddharth Malhotra",
    galleryStatus: "Photos Uploaded",
    bookingStatus: "confirmed",
    hourlyPackages: [
      {
        category: "Elite",
        hours: "12 Hours",
        eventDate: "2026-05-25",
        eventTime: "06:00 - 18:00",
        services: [
          { name: "Photographer", qty: 3, price: 25000 },
          { name: "Cinematographer", qty: 2, price: 30000 }
        ],
      }
    ],
  },
  {
    bookingId: "BK010",
    clientName: "Rohan Gupta",
    eventAddress: "Ahmedabad, Gujarat",
    assignedPhotographer: "",
    galleryStatus: "Upload Pending",
    bookingStatus: "pending",
    hourlyPackages: [
      {
        category: "Standard",
        hours: "6 Hours",
        eventDate: "2026-05-28",
        eventTime: "10:00 - 16:00",
        services: [
          { name: "Videographer", qty: 1, price: 9000 },
          { name: "Lighting", qty: 1, price: 3000 }
        ],
      }
    ],
  },
  {
    bookingId: "BK011",
    clientName: "Meera Nair",
    eventAddress: "Kochi, Kerala",
    assignedPhotographer: "Kiran Kumar",
    galleryStatus: "Upload Pending",
    bookingStatus: "confirmed",
    hourlyPackages: [
      {
        category: "Premium",
        hours: "8 Hours",
        eventDate: "2026-06-01",
        eventTime: "14:00 - 22:00",
        services: [
          { name: "Photographer", qty: 2, price: 12000 },
          { name: "Editing", qty: 3, price: 4500 }
        ],
      }
    ],
  }
];

async function seedHourly() {
  await mongoose.connect("mongodb+srv://mohsin:Hire_Roofers@hireroofers.az6w7wp.mongodb.net/photographer?retryWrites=true&w=majority");
  
  let user = await User.findOne();
  if(!user) {
      user = await User.create({ username: "test_user", email: "test@veroa.com", password: "password", role: "user" });
  }

  let service = await Service.findOne();
  if(!service) {
      service = await Service.create({ serviceName: "Hourly Event", serviceDescription: "Event based on hours" });
  }

  for (const item of hourlyData) {
      const payload = {
          veroaBookingId: item.bookingId,
          client_id: user._id,
          service_id: service._id,
          address: item.eventAddress,
          city: item.eventAddress.split(',')[0],
          galleryStatus: item.galleryStatus,
          status: item.bookingStatus === "confirmed" ? "confirmed" : "pending",
          bookingStatus: item.bookingStatus === "confirmed" ? "accepted" : "pending",
          hourlyPackages: item.hourlyPackages,
          totalAmount: item.hourlyPackages.reduce((sum, pkg) => sum + pkg.services.reduce((pSum, svc) => pSum + (svc.price || 0), 0), 0),
          bookingDate: new Date(item.hourlyPackages[0].eventDate + "T" + item.hourlyPackages[0].eventTime.split(' - ')[0]),
          eventDate: item.hourlyPackages[0].eventDate
      };

      await ServiceBooking.create(payload);
      console.log(`Created hourly booking: ${item.bookingId}`);
  }

  console.log("Hourly seeding complete!");
  process.exit();
}

seedHourly();
