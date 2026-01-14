import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Conversation from "../models/Conversation.mjs";
import Message from "../models/Message.mjs";
import ServiceBooking from "../models/ServiceBookings.mjs";
import Quote from "../models/Quote.mjs";
import User from "../models/User.mjs";
import { socketAuthMiddleware } from "../middleware/socketAuthMiddleware.mjs";

let io;

export const initSocket = (server) => {
    console.log("Initializing Socket.IO...");
    io = new Server(server, {
        cors: {
            origin: [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
            ],
            methods: ["GET", "POST"],
        },
    });

    // Use the dedicated auth middleware
    io.use(socketAuthMiddleware);

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.user.id}`);

        // Join Booking Chat Room
        socket.on("join_booking_chat", async ({ bookingId }) => {
            console.log(`Socket Event: join_booking_chat. User: ${socket.user.id}, Booking: ${bookingId}`);
            try {
                // Validate if user belongs to this booking or quote
                let context = await ServiceBooking.findById(bookingId);
                let type = 'booking';

                if (!context) {
                    context = await Quote.findById(bookingId);
                    type = 'quote';
                }

                if (!context) {
                    return socket.emit("error", "Booking/Quote not found");
                }

                // Check if user is client or photographer (for booking) or client (for quote)
                let isParticipant = false;

                if (type === 'booking') {
                    isParticipant =
                        context.client_id.toString() === socket.user.id ||
                        (context.photographer_id && context.photographer_id.toString() === socket.user.id);
                } else {
                    // For Quote, only Client is a participant (plus Admin)
                    isParticipant = context.clientId.toString() === socket.user.id;
                }

                // Check access
                if (!isParticipant && socket.user.userType !== 'admin') {
                    return socket.emit("error", "Unauthorized access to this chat");
                }

                // Find or create conversation
                let conversation = await Conversation.findOne({ bookingId });
                if (!conversation) {
                    const participants = [];
                    if (type === 'booking') {
                        participants.push(context.client_id);
                        if (context.photographer_id) participants.push(context.photographer_id);
                    } else {
                        participants.push(context.clientId);
                    }
                    
                    conversation = await Conversation.create({
                        bookingId,
                        participants
                    });
                }

                const roomName = `booking_${bookingId}`;
                socket.join(roomName);
                console.log(`User ${socket.user.id} joined room ${roomName}`);

                // Notify room
                // socket.to(roomName).emit("user_joined", { userId: socket.user.id });

            } catch (error) {
                console.error("Join Error:", error);
                socket.emit("error", "Failed to join chat");
            }
        });

        // Send Message
        socket.on("send_message", async ({ bookingId, message, type = "text" }) => {
            console.log(`Socket Event: send_message. User: ${socket.user.id}, Booking: ${bookingId}, Type: ${type}`);
            try {
                const roomName = `booking_${bookingId}`;

                // 1. Get Conversation
                const conversation = await Conversation.findOne({ bookingId });
                if (!conversation) return socket.emit("error", "Conversation not found");

                // 2. Create Message
                const newMessage = await Message.create({
                    conversationId: conversation._id,
                    senderId: socket.user.id,
                    message,
                    messageType: type,
                });

                // 3. Update Conversation (last message)
                conversation.lastMessage = message;
                conversation.lastMessageAt = new Date();
                await conversation.save();

                // 4. Populate sender details and Emit to Room
                await newMessage.populate("senderId", "username avatar");
                
                io.to(roomName).emit("receive_message", newMessage);
                console.log(`Message sent to room ${roomName}`);

            } catch (error) {
                console.error("Send Message Error:", error);
                socket.emit("error", "Failed to send message");
            }
        });

        // Typing Indicators
        socket.on("typing", ({ bookingId }) => {
            socket.to(`booking_${bookingId}`).emit("typing", { userId: socket.user.id });
        });

        socket.on("stop_typing", ({ bookingId }) => {
            socket.to(`booking_${bookingId}`).emit("stop_typing", { userId: socket.user.id });
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.user.id);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};
