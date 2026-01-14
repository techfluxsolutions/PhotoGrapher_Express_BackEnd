import { io } from "socket.io-client";
import mongoose from "mongoose";
import User from "../models/User.mjs";
import ServiceBooking from "../models/ServiceBookings.mjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const SOCKET_URL = "http://localhost:5002";

async function runTest() {
    try {
        // 1. Database Connection for Setup
        if (process.env.MONGODB_URI) {
            await mongoose.connect(process.env.MONGODB_URI);
            console.log("DB Connected for test setup");
        }

        // 2. Create/Find Dummy User & Booking
        let user = await User.findOne({ email: "testuser@example.com" });
        if (!user) {
            user = await User.create({
                username: "Test User",
                email: "testuser@example.com",
                mobileNumber: "9999999999",
                password: "password123"
            });
            console.log("Created test user");
        }

        // Create Dummy Booking
        let booking = await ServiceBooking.create({
            client_id: user._id,
            service_id: new mongoose.Types.ObjectId(), // Fake service ID
            bookingDate: new Date(),
            flatOrHouseNo: "123",
            streetName: "Test St",
            city: "Test City",
            state: "Test State",
            postalCode: "123456"
        });
        console.log("Created test booking:", booking._id);

        // 3. Generate Token
        const token = jwt.sign({ id: user._id, role: "user" }, process.env.JWT_SECRET, { expiresIn: "1h" });
        console.log("Generated Token");

        // 4. Connect Socket
        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ["websocket"]
        });

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);

            // 5. Join Room
            socket.emit("join_booking_chat", { bookingId: booking._id });
        });

        socket.on("error", (err) => {
            console.error("Socket Error:", err);
        });

        // 6. Send Message after short delay
        setTimeout(() => {
            console.log("Sending message...");
            socket.emit("send_message", { bookingId: booking._id, message: "Hello from test script!" });
        }, 1000);

        // 7. Verify Receipt
        socket.on("receive_message", (data) => {
            console.log("Message Received:", data);
            if (data.message === "Hello from test script!") {
                console.log("SUCCESS: Test Passed");
                process.exit(0);
            }
        });

        // Timeout fail
        setTimeout(() => {
            console.log("Timeout waiting for message echo");
            process.exit(1);
        }, 5000);

    } catch (err) {
        console.error("Test Setup Failed:", err);
        process.exit(1);
    }
}

runTest();
