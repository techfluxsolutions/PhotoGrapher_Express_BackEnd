
import mongoose from 'mongoose';
import ServiceBooking from '../models/ServiceBookings.mjs';
import User from '../models/User.mjs';
import Service from '../models/Service.mjs';

const dummyData = [
  // ===================== BOOKING 1 (FULL CONFIRMED - MULTI SLOT) =====================
  {
    bookingId: "BK001",
    clientName: "Rahul Shah",
    eventAddress: "Mumbai, Maharashtra",
    assignedPhotographer: "Amit Kumar",
    galleryUpload: true,
    galleryStatus: "Photos Uploaded",
    bookingStatus: "confirmed",
    hourlyPackages: [
      {
        category: "Standard",
        hours: "0-3 Hours",
        services: [
          { name: "Photographer", qty: 2, price: 8000 },
          { name: "Videographer", qty: 1, price: 5000 },
        ],
      },
      {
        category: "Standard",
        hours: "5 Hours",
        services: [
          { name: "Editing", qty: 2, price: 3000 },
        ],
      },
      {
        category: "Premium",
        hours: "8 Hours",
        services: [
          { name: "Drone Shoot", qty: 1, price: 7000 },
          { name: "Lighting Setup", qty: 2, price: 6000 },
        ],
      },
    ],
  },

  // ===================== BOOKING 2 (PENDING + NO PHOTOGRAPHER) =====================
  {
    bookingId: "BK002",
    clientName: "Amit Patel",
    eventAddress: "Jaipur, Rajasthan",
    assignedPhotographer: "",
    galleryUpload: false,
    galleryStatus: "Upload Pending",
    bookingStatus: "pending",
    hourlyPackages: [
      {
        category: "Premium",
        hours: "5 Hours",
        services: [
          { name: "Videographer", qty: 1, price: 6000 },
          { name: "Photographer", qty: 1, price: 6000 },
        ],
      },
    ],
  },

  // ===================== BOOKING 3 (PROCESSING GALLERY + MIX STATUS) =====================
  {
    bookingId: "BK003",
    clientName: "Neha Mehta",
    eventAddress: "Delhi",
    assignedPhotographer: "Rohit Sharma",
    galleryUpload: true,
    galleryStatus: "Upload Pending",
    bookingStatus: "confirmed",
    hourlyPackages: [
      {
        category: "Standard",
        hours: "0-3 Hours",
        services: [
          { name: "Photographer", qty: 2, price: 8000 },
        ],
      },
      {
        category: "Standard",
        hours: "8 Hours",
        services: [
          { name: "Videographer", qty: 2, price: 18000 },
          { name: "Editing", qty: 4, price: 5000 },
        ],
      },
    ],
  },

  // ===================== BOOKING 4 (FLOAT / UNASSIGNED - HEAVY PACKAGE) =====================
  {
    bookingId: "BK004",
    clientName: "Karan Desai",
    eventAddress: "Bangalore",
    assignedPhotographer: "",
    galleryUpload: false,
    galleryStatus: "Upload Pending",
    bookingStatus: "pending",
    hourlyPackages: [
      {
        category: "Standard",
        hours: "5 Hours",
        services: [
          { name: "Drone Shoot", qty: 1, price: 5000 },
        ],
      },
      {
        category: "Standard",
        hours: "8 Hours",
        services: [
          { name: "Photographer", qty: 3, price: 18000 },
          { name: "Editing", qty: 5, price: 6000 },
        ],
      },
    ],
  },

  // ===================== BOOKING 5 (CANCELLED CASE) =====================
  {
    bookingId: "BK005",
    clientName: "Sana Khan",
    eventAddress: "Hyderabad",
    assignedPhotographer: "Unassigned",
    galleryUpload: false,
    galleryStatus: "Upload Pending",
    bookingStatus: "cancelled",
    hourlyPackages: [
      {
        category: "Premium",
        hours: "0-3 Hours",
        services: [
          { name: "Photographer", qty: 1, price: 5000 },
        ],
      },
    ],
  },

  // ===================== BOOKING 6 (PARTIAL ASSIGNMENT CASE) =====================
  {
    bookingId: "BK006",
    clientName: "Vikram Joshi",
    eventAddress: "Pune",
    assignedPhotographer: "Partially Assigned",
    galleryUpload: false,
    galleryStatus: "Upload Pending",
    bookingStatus: "confirmed",
    hourlyPackages: [
      {
        category: "Standard",
        hours: "0-3 Hours",
        services: [
          { name: "Photographer", qty: 1, price: 4000 },
        ],
      },
      {
        category: "Standard",
        hours: "5 Hours",
        services: [
          { name: "Videographer", qty: 1, price: 6000 },
        ],
      },
    ],
  },
];

async function seed() {
  await mongoose.connect("mongodb+srv://mohsin:Hire_Roofers@hireroofers.az6w7wp.mongodb.net/photographer?retryWrites=true&w=majority");
  
  // Get a valid user or create dummy
  let user = await User.findOne();
  if(!user) {
      user = await User.create({ username: "dummy_client", email: "client@test.com", password: "password", role: "user" });
  }

  // Get a valid service or create dummy
  let service = await Service.findOne();
  if(!service) {
      service = await Service.create({ serviceName: "Photography", serviceDescription: "General Photography" });
  }

  for (const item of dummyData) {
      const payload = {
          veroaBookingId: item.bookingId,
          client_id: user._id,
          service_id: service._id,
          address: item.eventAddress,
          city: item.eventAddress.split(',')[0],
          galleryStatus: item.galleryStatus,
          status: item.bookingStatus === "confirmed" ? "confirmed" : (item.bookingStatus === "cancelled" ? "canceled" : "pending"),
          bookingStatus: item.bookingStatus === "confirmed" ? "accepted" : (item.bookingStatus === "cancelled" ? "rejected" : "pending"),
          hourlyPackages: item.hourlyPackages,
          totalAmount: item.hourlyPackages.reduce((sum, pkg) => sum + pkg.services.reduce((pSum, svc) => pSum + (svc.price || 0), 0), 0),
          bookingDate: new Date("2026-04-25T10:00:00Z"), // Placeholder
          eventDate: "2026-04-25"
      };

      await ServiceBooking.create(payload);
      console.log(`Created booking: ${item.bookingId}`);
  }

  console.log("Seeding complete!");
  process.exit();
}

seed();
