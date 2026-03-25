
import 'dotenv/config';
import mongoose from 'mongoose';
import ServiceBooking from './models/ServiceBookings.mjs';
import DataLinks from './models/DataLinks.js';
import User from './models/User.mjs';
import Service from './models/Service.mjs';

async function createDummyData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        // 1. Get/Create test user
        let user = await User.findOne({ email: "testuser@example.com" });
        if (!user) {
            user = await User.create({
                username: "testuser",
                email: "testuser@example.com",
                mobileNumber: "1234567890",
                userType: "user"
            });
            console.log("Created test user:", user._id);
        }

        // 2. Get/Create test service
        let service = await Service.findOne({ serviceName: "Test Photography" });
        if (!service) {
            service = await Service.create({
                serviceName: "Test Photography",
                serviceCost: "5000",
                serviceDescription: "Sample service for testing remaining days"
            });
            console.log("Created test service:", service._id);
        }

        const now = new Date();
        const tenDaysAgo = new Date(now.getTime() - (10 * 24 * 60 * 60 * 1000));
        const fifteenDaysAgo = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));

        const testCases = [
            {
                name: "Case 1: Fully Paid, Uploaded Today (14 days left, Unblurred)",
                paymentStatus: "fully paid",
                firstPhotoUploadedAt: now,
                veroaBookingId: "VEROA-TEST-001"
            },
            {
                name: "Case 2: Fully Paid, Uploaded 10 Days Ago (4 days left, Unblurred)",
                paymentStatus: "fully paid",
                firstPhotoUploadedAt: tenDaysAgo,
                veroaBookingId: "VEROA-TEST-002"
            },
            {
                name: "Case 3: Fully Paid, Uploaded 15 Days Ago (0 days left, Blurred)",
                paymentStatus: "fully paid",
                firstPhotoUploadedAt: fifteenDaysAgo,
                veroaBookingId: "VEROA-TEST-003"
            },
            {
                name: "Case 4: Partially Paid, Uploaded Today (Blurred, No countdown)",
                paymentStatus: "pending",
                firstPhotoUploadedAt: now,
                veroaBookingId: "VEROA-TEST-004"
            }
        ];

        for (const testCase of testCases) {
            const booking = await ServiceBooking.create({
                service_id: service._id,
                client_id: user._id,
                bookingDate: now,
                paymentStatus: testCase.paymentStatus,
                firstPhotoUploadedAt: testCase.firstPhotoUploadedAt,
                veroaBookingId: testCase.veroaBookingId,
                flatOrHouseNo: "Testing",
                streetName: "Remaining Days",
                city: "TestCity",
                state: "TestState",
                postalCode: "123456",
                totalAmount: 5000,
                full_Payment: testCase.paymentStatus === "fully paid"
            });

            console.log(`Created Booking for ${testCase.name}: ${booking._id}`);

            // Add dummy data link for this booking
            await DataLinks.create({
                dataLink: "https://example.com/dummy.jpg",
                key: `testing/${testCase.veroaBookingId}/dummy.jpg`,
                bookingid: booking._id.toString(),
                clientId: user._id,
                veroaBookingId: testCase.veroaBookingId
            });
        }

        console.log("\nDummy data created successfully!");
        console.log("You can now test the endpoint: /upload/getArrayImages/<bookingId>");

    } catch (error) {
        console.error("Error creating dummy data:", error);
    } finally {
        await mongoose.disconnect();
    }
}

createDummyData();
