
import mongoose from 'mongoose';
import 'dotenv/config';
import SidebarIcon from './models/SidebarIcon.mjs';

const data = [
    {
        name: "Dashboard",
        activeIcon: "/assests/sidebar/dashboard-active.png",
        inactiveIcon: "/assests/sidebar/dashboard-inactive.png",
        order: 1
    },
    {
        name: "Queries",
        activeIcon: "/assests/sidebar/queries-active.png",
        inactiveIcon: "/assests/sidebar/queries-inactive.png",
        order: 2
    },
    {
        name: "My Quote",
        activeIcon: "/assests/sidebar/quote-active.png",
        inactiveIcon: "/assests/sidebar/quote-inactive.png",
        order: 3
    },
    {
        name: "Shoot Booking",
        activeIcon: "/assests/sidebar/camera-active.png",
        inactiveIcon: "/assests/sidebar/camera-inactive.png",
        order: 4
    },
    {
        name: "Payments",
        activeIcon: "/assests/sidebar/payment-active.png",
        inactiveIcon: "/assests/sidebar/payment-inactive.png",
        order: 5
    },
    {
        name: "Storage Management",
        activeIcon: "/assests/sidebar/storageManagement-active.png",
        inactiveIcon: "/assests/sidebar/storageManagement-inactive.png",
        order: 6
    },
    {
        name: "Customers",
        activeIcon: "/assests/sidebar/customer-active.png",
        inactiveIcon: "/assests/sidebar/customer-inactive.png",
        order: 7
    },
    {
        name: "Contact Us",
        activeIcon: "/assests/sidebar/contact-us-active.png",
        inactiveIcon: "/assests/sidebar/contact-us-inactive.png",
        order: 8
    },
    {
        name: "Join Us",
        activeIcon: "/assests/sidebar/join-us-active.png",
        inactiveIcon: "/assests/sidebar/join-us-inactive.png",
        order: 9
    },
    {
        name: "Services",
        activeIcon: "/assests/sidebar/service-active.png",
        inactiveIcon: "/assests/sidebar/service-inactive.png",
        order: 10
    },
    {
        name: "Photographers",
        activeIcon: "/assests/sidebar/photographer-active.png",
        inactiveIcon: "/assests/sidebar/photographer-inactive.png",
        order: 11
    },
    {
        name: "Commission",
        activeIcon: "/assests/sidebar/commission-active.png",
        inactiveIcon: "/assests/sidebar/commission-inactive.png",
        order: 12
    },
    {
        name: "Roles",
        activeIcon: "/assests/sidebar/role-active.png",
        inactiveIcon: "/assests/sidebar/role-inactive.png",
        order: 13
    },
    {
        name: "Staff",
        activeIcon: "/assests/sidebar/staff-active.png",
        inactiveIcon: "/assests/sidebar/staff-inactive.png",
        order: 14
    },
    {
        name: "Subscribers",
        activeIcon: "/assests/sidebar/subscribers-active.png",
        inactiveIcon: "/assests/sidebar/subscribers-inactive.png",
        order: 15
    }
];

async function seed() {
    try {
        console.log("MONGODB_URI:", process.env.MONGODB_URI);
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is not defined");
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");
        
        await SidebarIcon.deleteMany({});
        console.log("Cleared existing icons");
        
        await SidebarIcon.insertMany(data);
        console.log("Seeded icons successfully");
        
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
        process.exit(0);
    } catch (error) {
        console.error("Error seeding icons:", error);
        process.exit(1);
    }
}

seed();
