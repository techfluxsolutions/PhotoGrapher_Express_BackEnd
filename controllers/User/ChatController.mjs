import Conversation from "../../models/Conversation.mjs";
import Message from "../../models/Message.mjs";
import ServiceBooking from "../../models/ServiceBookings.mjs";
import Quote from "../../models/Quote.mjs";
//import Admin from "../../models/Admin.mjs";
import AdminEmailAuth from "../../models/AdminEmailAuth.mjs";
import { getIO } from "../../services/SocketService.mjs";



class ChatController {

    // Get all conversations for the logged-in user
    async getConversations(req, res, next) {
        try {
            const userId = req.user.id;

            // Find conversations where user is a participant
            const conversations = await Conversation.find({ participants: userId })
                .populate("quoteId", "eventType eventDate location") // Populate quote details
                .populate("participants", "username avatar")
                .sort({ lastMessageAt: -1 });

            return res.json({ success: true, data: conversations });
        } catch (err) {
            next(err);
        }
    }

    // Get messages for a specific booking or quote (Chat History)
    async getMessages(req, res, next) {
        try {
            const { bookingId } = req.params; // This can be bookingId or quoteId depending on how it's called
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const skip = (page - 1) * limit;

            // Try to find by bookingId first, then by quoteId
            let conversation = await Conversation.findOne({
                $or: [{ bookingId }, { quoteId: bookingId }]
            });

            if (!conversation) {
                // If no conversation exists yet, return empty array instead of 404 for valid bookings/quotes
                const booking = await ServiceBooking.findById(bookingId);
                const quote = !booking ? await Quote.findById(bookingId) : null;

                if (!booking && !quote) {
                    return res.status(404).json({ success: false, message: "Booking/Quote not found" });
                }

                return res.json({ success: true, data: [], meta: { total: 0, page, limit } });
            }

            const isParticipant = conversation.participants.some((p) => p.toString() === req.user.id);
            if (!isParticipant && !req.user.isAdmin) {
                return res.status(403).json({ success: false, message: "Access denied" });
            }

            const total = await Message.countDocuments({ conversationId: conversation._id });

            const messages = await Message.find({ conversationId: conversation._id })
                .sort({ createdAt: -1 }) // Get latest first
                .skip(skip)
                .limit(limit)
                .populate("senderId", "username avatar"); // To show sender details

            return res.json({
                success: true,
                data: messages.reverse(), // Client usually expects chronological order for chat
                meta: { total, page, limit },
            });
        } catch (err) {
            next(err);
        }
    }

    // Create a conversation between the user and all admins for a specific quote
    async createConversation(req, res, next) {
        try {
            const userId = req.user.id;
            const { quoteId } = req.body;

            if (!quoteId) {
                return res.status(400).json({ success: false, message: "quoteId is required" });
            }

            // Verify the quote exists and belongs to the user
            const quote = await Quote.findById(quoteId);
            if (!quote) {
                return res.status(404).json({ success: false, message: "Quote not found" });
            }

            // Fetch all admin IDs from the admin table
            const admins = await AdminEmailAuth.find({}, "_id");
            const adminIds = admins.map(admin => admin._id);

            if (adminIds.length === 0) {
                return res.status(404).json({ success: false, message: "No admins found to start a conversation" });
            }

            // Participants include the user and all admins
            const participants = [userId, ...adminIds];

            // Check if a conversation already exists for this quoteId
            let conversation = await Conversation.findOne({ quoteId });

            if (!conversation) {
                conversation = await Conversation.create({
                    quoteId,
                    participants: participants
                });
            } else {
                // Ensure the user is in the participants list if the conversation already exists
                if (!conversation.participants.includes(userId)) {
                    conversation.participants.push(userId);
                    await conversation.save();
                }
            }

            return res.json({ success: true, data: conversation });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }

    // Send a message via REST API
    async sendMessage(req, res, next) {
        try {
            const { quoteId, message, type = "text", messageType, budget, startDate, endDate, location, eventType } = req.body;
            const userId = req.user.id;

            if (!quoteId || !message) {
                return res.status(400).json({ success: false, message: "quoteId and message are required" });
            }

            // Find the conversation
            let conversation = await Conversation.findOne({
                $or: [{ bookingId: quoteId }, { quoteId: quoteId }]
            });

            if (!conversation) {
                return res.status(404).json({ success: false, message: "Conversation not found" });
            }

            // Check if user is a participant
            if (!conversation.participants.includes(userId) && !req.user.isAdmin) {
                return res.status(403).json({ success: false, message: "Access denied" });
            }

            // Create the message
            const newMessage = await Message.create({
                conversationId: conversation._id,
                senderId: userId,
                message,
                messageType: messageType || type,
                budget,
                startDate,
                endDate,
                location,
                quoteId,
                eventType
            });

            // Update conversation last message info
            conversation.lastMessage = message;
            conversation.lastMessageAt = new Date();
            await conversation.save();

            // Populate sender details for the response
            await newMessage.populate("senderId", "username avatar");

            // Notify others via socket
            try {
                const io = getIO();
                const roomName = `booking_${String(quoteId)}`;
                console.log(`📡 Emitting message to room: ${roomName}`);
                io.to(roomName).emit("receive_message", newMessage);
            } catch (socketErr) {
                console.error("❌ Socket notification failed:", socketErr.message);
            }

            return res.status(201).json({ success: true, data: newMessage });
        } catch (err) {
            next(err);
        }
    }
}

export default new ChatController();
