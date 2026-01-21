import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Conversation from "../models/Conversation.mjs";
import Message from "../models/Message.mjs";
import ServiceBooking from "../models/ServiceBookings.mjs";
import Quote from "../models/Quote.mjs";
import User from "../models/User.mjs";
import Admin from "../models/Admin.mjs";
import { socketAuthMiddleware } from "../middleware/socketAuthMiddleware.mjs";


// const ADMIN_USER_ID = "6964a646eadb53313fb11881"; // Deprecated in favor of fetching all admins


let io;

export const initSocket = (server) => {
    console.log("Initializing Socket.IO...");
    io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);
                const allowedOrigins = [
                    "http://localhost:3000",
                    "http://127.0.0.1:3000",
                    "http://localhost:5173",
                    "http://localhost:5174",
                    "https://api-photographer.techfluxsolutions.com",
                    "https://photographer.techfluxsolutions.com",
                    "https://admin-photographer.techfluxsolutions.com",
                    "https://photo-grapher-user-website.vercel.app",
                    "https://photographer-admin-6nit.vercel.app",
                ];
                const isLocalhost = origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
                const isTechFlux = origin.endsWith(".techfluxsolutions.com");

                if (allowedOrigins.indexOf(origin) !== -1 || isLocalhost || isTechFlux) {
                    callback(null, true);
                } else {
                    callback(new Error("Not allowed by CORS"));
                }
            },
            methods: ["GET", "POST"],
            credentials: true,
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

                if (!isParticipant && socket.user.userType !== "admin") {
                    return socket.emit("error", "Unauthorized access to this chat");
                }

                let conversation = await Conversation.findOne({
                    $or: [{ bookingId: bookingId }, { quoteId: bookingId }]
                });

                if (!conversation) {
                    const participants = [];
                    const createData = { participants };

                    if (type === "booking") {
                        createData.bookingId = bookingId;
                        participants.push(context.client_id);
                        if (context.photographer_id) participants.push(context.photographer_id);
                    } else {
                        createData.quoteId = bookingId;
                        participants.push(context.clientId);
                        const admins = await Admin.find({}, "_id");
                        participants.push(...admins.map(a => a._id));
                    }

                    conversation = await Conversation.create(createData);
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

        socket.on("send_message", async ({ bookingId, message, type = "text", messageType, budget, startDate, endDate, location, quoteId, eventType }) => {
            console.log(`Socket Event: send_message. User: ${socket.user.id}, Booking: ${bookingId}, Type: ${messageType || type}`);
            try {
                const roomName = `booking_${bookingId}`;

                let conversation = await Conversation.findOne({
                    $or: [{ bookingId: bookingId }, { quoteId: bookingId }]
                });

                if (!conversation) {
                    let context = await ServiceBooking.findById(bookingId);
                    let ctxType = "booking";

                    if (!context) {
                        context = await Quote.findById(bookingId);
                        ctxType = "quote";
                    }

                    if (!context) {
                        return socket.emit("error", "Booking/Quote not found");
                    }

                    let isParticipant = false;
                    if (ctxType === "booking") {
                        isParticipant =
                            context.client_id.toString() === socket.user.id ||
                            (context.photographer_id &&
                                context.photographer_id.toString() === socket.user.id);
                    } else {
                        isParticipant = context.clientId.toString() === socket.user.id;
                    }

                    if (!isParticipant && socket.user.userType !== "admin") {
                        return socket.emit("error", "Unauthorized access to this chat");
                    }

                    const participants = [];
                    const createData = { participants };

                    if (ctxType === "booking") {
                        createData.bookingId = bookingId;
                        participants.push(context.client_id);
                        if (context.photographer_id) participants.push(context.photographer_id);
                    } else {
                        createData.quoteId = bookingId;
                        participants.push(context.clientId);
                        const admins = await Admin.find({}, "_id");
                        participants.push(...admins.map(a => a._id));
                    }

                    conversation = await Conversation.create(createData);
                }


                const newMessage = await Message.create({
                    conversationId: conversation._id,
                    senderId: socket.user.id,
                    message,
                    messageType: messageType || type,
                    budget,
                    startDate,
                    endDate,
                    location,
                    quoteId: quoteId || bookingId, // Use quoteId if provided, else bookingId
                    eventType
                });

                conversation.lastMessage = message;
                conversation.lastMessageAt = new Date();
                await conversation.save();

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
