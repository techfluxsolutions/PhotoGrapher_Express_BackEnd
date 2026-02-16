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
                    "https://superadmin-9xk2lmq7zap3rt8.veroastudioz.com",
                    "https://dev-api.veroastudioz.com",
                    "https://veroastudioz.com"
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
        socket.join(`user_${socket.user.id}`);

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

        socket.on("send_message", async (data) => {
            console.log(`Socket Event: send_message. User: ${socket.user.id}, Data:`, JSON.stringify(data));
            try {
                // Robust extraction from top-level or nested message object
                let {
                    bookingId,
                    quoteId,
                    message,
                    type = "text",
                    messageType,
                    budget,
                    startDate,
                    endDate,
                    location,
                    eventType,
                    flatOrHouseNo,
                    streetName,
                    city,
                    state,
                    postalCode
                } = data;

                let finalMessage = message;
                let finalMessageType = messageType || type;
                let finalBudget = budget;
                let finalStartDate = startDate;
                let finalEndDate = endDate;
                let finalLocation = location;
                let finalEventType = eventType;
                let finalQuoteId = quoteId;
                let finalBookingId = bookingId;

                if (typeof message === "object" && message !== null) {
                    finalMessage = message.message || finalMessage;
                    finalMessageType = message.messageType || message.type || finalMessageType;
                    finalBudget = message.budget || finalBudget;
                    finalStartDate = message.startDate || finalStartDate;
                    finalEndDate = message.endDate || finalEndDate;
                    finalLocation = message.location || finalLocation;
                    finalEventType = message.eventType || finalEventType;
                    finalQuoteId = message.quoteId || finalQuoteId;
                    finalBookingId = message.bookingId || finalBookingId;
                    finalFlatOrHouseNo = message.flatOrHouseNo || finalFlatOrHouseNo;
                    finalStreetName = message.streetName || finalStreetName;
                    finalCity = message.city || finalCity;
                    finalState = message.state || finalState;
                    finalPostalCode = message.postalCode || finalPostalCode;
                }

                // The reference ID used for the room and finding conversation
                const refId = finalBookingId || finalQuoteId;

                if (!refId) {
                    return socket.emit("error", "No Booking or Quote ID provided");
                }

                const roomName = `booking_${refId}`;

                let conversation = await Conversation.findOne({
                    $or: [{ bookingId: refId }, { quoteId: refId }]
                });

                if (!conversation) {
                    let context = await ServiceBooking.findById(refId);
                    let ctxType = "booking";

                    if (!context) {
                        context = await Quote.findById(refId);
                        ctxType = "quote";
                    }

                    if (!context) {
                        return socket.emit("error", "Booking/Quote not found for ID: " + refId);
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
                        createData.bookingId = refId;
                        participants.push(context.client_id);
                        if (context.photographer_id) participants.push(context.photographer_id);
                    } else {
                        createData.quoteId = refId;
                        participants.push(context.clientId);
                        const admins = await Admin.find({}, "_id");
                        participants.push(...admins.map(a => a._id));
                    }

                    conversation = await Conversation.create(createData);
                }


                const newMessage = await Message.create({
                    conversationId: conversation._id,
                    senderId: socket.user.id,
                    message: finalMessage,
                    messageType: finalMessageType,
                    budget: finalBudget,
                    startDate: finalStartDate,
                    endDate: finalEndDate,
                    location: finalLocation,
                    quoteId: finalQuoteId || (conversation.quoteId) || null,
                    eventType: finalEventType,
                    flatOrHouseNo: finalFlatOrHouseNo,
                    streetName: finalStreetName,
                    city: finalCity,
                    state: finalState,
                    postalCode: finalPostalCode
                });

                conversation.lastMessage = finalMessageType === "text" ? finalMessage : `[${finalMessageType}]`;
                conversation.lastMessageAt = new Date();
                await conversation.save();

                await newMessage.populate("senderId", "username avatar");

                io.to(roomName).emit("receive_message", newMessage);
                console.log(`Message sent to room ${roomName}`);

                // Notify all participants about the conversation update
                const participants = conversation.participants;
                participants.forEach(participantId => {
                    io.to(`user_${participantId}`).emit("conversation:update", {
                        conversationId: conversation._id,
                        lastMessage: conversation.lastMessage,
                        lastMessageAt: conversation.lastMessageAt,
                        bookingId: conversation.bookingId,
                        quoteId: conversation.quoteId
                    });
                });

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
