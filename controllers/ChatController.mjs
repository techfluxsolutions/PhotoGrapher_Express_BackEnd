import Conversation from "../models/Conversation.mjs";
import Message from "../models/Message.mjs";
import ServiceBooking from "../models/ServiceBookings.mjs";
import Quote from "../models/Quote.mjs";

class ChatController {

    // Get all conversations for the logged-in user
    async getConversations(req, res, next) {
        try {
            const userId = req.user.id;

            // Find conversations where user is a participant
            const conversations = await Conversation.find({ participants: userId })
                .populate("bookingId", "status bookingDate") // Populate booking details if needed
                .populate("participants", "username avatar") // Populate participant details
                .sort({ lastMessageAt: -1 });

            return res.json({ success: true, data: conversations });
        } catch (err) {
            next(err);
        }
    }

    // Get messages for a specific booking (Chat History)
    async getMessages(req, res, next) {
        try {
            const { bookingId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const skip = (page - 1) * limit;

            const conversation = await Conversation.findOne({ bookingId });

            if (!conversation) {
                // If no conversation exists yet, return empty array instead of 404 for valid bookings/quotes
                const booking = await ServiceBooking.findById(bookingId);
                const quote = !booking ? await Quote.findById(bookingId) : null;

                if (!booking && !quote) {
                    return res.status(404).json({ success: false, message: "Booking/Quote not found" });
                }

                return res.json({ success: true, data: [], meta: { total: 0, page, limit } });
            }

            // Check access? (Middleware usually handles auth, but checking participation is good)
            if (!conversation.participants.includes(req.user.id) && !req.user.isAdmin) {
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
}

export default new ChatController();
