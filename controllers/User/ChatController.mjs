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
                .populate("bookingId", "status bookingDate") // Populate booking details
                .populate("participants", "username avatar")
                .sort({ lastMessageAt: -1 });

            const baseUrl = `${req.protocol}://${req.get("host")}`;
            const formattedConversations = conversations.map(conv => {
                const convObj = conv.toObject();
                if (convObj.participants) {
                    convObj.participants = convObj.participants.map(p => {
                        if (p.avatar && !p.avatar.startsWith("http")) {
                            p.avatar = `${baseUrl}/${p.avatar.replace(/\\/g, "/")}`;
                        }
                        return p;
                    });
                }
                return convObj;
            });

            return res.json({ success: true, data: formattedConversations });
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

            // Try to find by bookingId or quoteId
            let conversation = await Conversation.findOne({
                $or: [{ bookingId: bookingId }, { quoteId: bookingId }]
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

            // If the user is an admin viewing these messages, mark them as read by admin
            if (req.user.isAdmin) {
                await Message.updateMany(
                    { conversationId: conversation._id, isAdminRead: false },
                    { $set: { isAdminRead: true } }
                );
            }

            const total = await Message.countDocuments({ conversationId: conversation._id });
            //

            let pinedBookings;

            const gotBookings = await ServiceBooking.findOne({ _id: conversation.bookingId }).populate('service_id additionalServicesId', 'serviceName serviceCost')
            if (gotBookings) {
                pinedBookings = gotBookings;
            } else {
                pinedBookings = await Quote.findOne({ _id: conversation.quoteId })
                    .populate({
                        path: 'service_id',
                        select: 'serviceName serviceCost'
                    })
                    .populate({
                        path: 'additionalServicesId',
                        select: 'serviceName serviceCost',
                        options: { strictPopulate: false } // if needed
                    });
            }

            const messages = await Message.find({ conversationId: conversation._id })
                .sort({ createdAt: -1 }) // Get latest first
                .skip(skip)
                .limit(limit)
                .populate("senderId", "username avatar"); // To show sender details

            const baseUrl = `${req.protocol}://${req.get("host")}`;
            const formattedMessages = messages.map(msg => {
                const msgObj = msg.toObject();
                if (msgObj.senderId && msgObj.senderId.avatar && !msgObj.senderId.avatar.startsWith("http")) {
                    msgObj.senderId.avatar = `${baseUrl}/${msgObj.senderId.avatar.replace(/\\/g, "/")}`;
                }
                return msgObj;
            });

            return res.json({
                success: true,
                pinned: pinedBookings,
                data: formattedMessages.reverse(), // Client usually expects chronological order for chat
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
                const userExists = conversation.participants.some(p => p.toString() === userId);
                if (!userExists) {
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
            const {
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
                attachmentUrl,
                address,
                requirements,
                editingPreferences,
                currentBudget,
                previousBudget,
                eventDuration,
                quoteType,
                phoneNumber,
                email,
                clientName,
                eventDate
            } = req.body;
            const userId = req.user.id;

            // Robust extraction if message is sent as an object
            let finalMessage = "";
            if (typeof message === "string") {
                finalMessage = message;
            }

            let finalMessageType = messageType || type;
            let finalBudget = budget;
            let finalStartDate = startDate;
            let finalEndDate = endDate;
            let finalLocation = location;
            let finalEventType = eventType;
            let finalQuoteId = quoteId;
            let finalBookingId = bookingId;
            let finalAttachmentUrl = attachmentUrl;
            let finalIsQuoteFinal = req.body.isQuoteFinal || false;

            // Additional fields
            let finalRequirements = requirements;
            let finalEditingPreferences = editingPreferences;
            let finalCurrentBudget = currentBudget;
            let finalPreviousBudget = previousBudget;
            let finalEventDuration = eventDuration;
            let finalQuoteType = quoteType;
            let finalPhoneNumber = phoneNumber;
            let finalEmail = email;
            let finalClientName = clientName;
            let finalEventDate = eventDate;

            // Address fields
            let finalFlatOrHouseNo = req.body.flatOrHouseNo;
            let finalStreetName = req.body.streetName;
            let finalCity = req.body.city;
            let finalState = req.body.state;
            let finalPostalCode = req.body.postalCode;
            let finalClientId = req.body.clientId;

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
                finalAttachmentUrl = message.attachmentUrl || finalAttachmentUrl;
                finalIsQuoteFinal = message.isQuoteFinal !== undefined ? message.isQuoteFinal : finalIsQuoteFinal;

                finalFlatOrHouseNo = message.flatOrHouseNo || finalFlatOrHouseNo;
                finalStreetName = message.streetName || finalStreetName;
                finalCity = message.city || finalCity;
                finalState = message.state || finalState;
                finalPostalCode = message.postalCode || finalPostalCode;

                finalRequirements = message.requirements || finalRequirements;
                finalEditingPreferences = message.editingPreferences !== undefined ? message.editingPreferences : finalEditingPreferences;
                finalCurrentBudget = message.currentBudget || finalCurrentBudget;
                finalPreviousBudget = message.previousBudget || finalPreviousBudget;
                finalEventDuration = message.eventDuration || finalEventDuration;
                finalQuoteType = message.quoteType || finalQuoteType;
                finalPhoneNumber = message.phoneNumber || finalPhoneNumber;
                finalEmail = message.email || finalEmail;
                finalClientName = message.clientName || finalClientName;
                finalEventDate = message.eventDate || finalEventDate;
            }

            if (typeof address === "object" && address !== null) {
                finalFlatOrHouseNo = address.flatOrHouseNo || finalFlatOrHouseNo;
                finalStreetName = address.streetName || finalStreetName;
                finalCity = address.city || finalCity;
                finalState = address.state || finalState;
                finalPostalCode = address.postalCode || finalPostalCode;
                finalClientId = address.clientId || finalClientId;
            }

            const refId = finalBookingId || finalQuoteId;

            // Allow empty message for non-text types (like paymentCard)
            if (!refId || (!finalMessage && finalMessageType === 'text')) {
                return res.status(400).json({ success: false, message: "bookingId/quoteId and message are required" });
            }

            // Find the conversation
            let conversation = await Conversation.findOne({
                $or: [{ bookingId: refId }, { quoteId: refId }]
            });

            if (!conversation) {
                return res.status(404).json({ success: false, message: "Conversation not found for ID: " + refId });
            }

            // Check if user is a participant
            const isParticipant = conversation.participants.some(p => p.toString() === userId);
            if (!isParticipant && !req.user.isAdmin) {
                return res.status(403).json({ success: false, message: "Access denied" });
            }

            // --- Update Quote Document logic ---
            // If this is a quote conversation, update the Quote document with any budget or event details provided
            const targetQuoteId = finalQuoteId || conversation.quoteId;
            if (targetQuoteId) {
                const existingQuote = await Quote.findById(targetQuoteId);
                if (existingQuote) {
                    const quoteUpdateData = {};

                    // Budget Negotiation Logic:
                    // If a new budget is provided, or a new currentBudget is provided,
                    // we shift the existing budget/currentBudget to previousBudget.
                    if (finalBudget !== undefined || finalCurrentBudget !== undefined) {
                        const newBudget = finalCurrentBudget !== undefined ? finalCurrentBudget : finalBudget;
                        const currentEffectiveBudget = existingQuote.currentBudget || existingQuote.budget;

                        // Only shift if the new budget is actually different from what we had
                        if (currentEffectiveBudget && currentEffectiveBudget !== newBudget) {
                            quoteUpdateData.previousBudget = currentEffectiveBudget;
                        } else if (!existingQuote.previousBudget && finalPreviousBudget) {
                            // If client explicitly sent previousBudget and we don't have one
                            quoteUpdateData.previousBudget = finalPreviousBudget;
                        }

                        quoteUpdateData.currentBudget = newBudget;

                        // If finalBudget was provided, update the main budget field as well
                        if (finalBudget !== undefined) {
                            quoteUpdateData.budget = finalBudget;
                        }
                    } else if (finalPreviousBudget !== undefined) {
                        quoteUpdateData.previousBudget = finalPreviousBudget;
                    }


                    // If currentBudget is still empty but budget exists, initialize it
                    if (!quoteUpdateData.currentBudget && !existingQuote.currentBudget && (finalBudget || existingQuote.budget)) {
                        quoteUpdateData.currentBudget = finalBudget || existingQuote.budget;
                    }

                    // If finalizing, include all other fields
                    if (finalIsQuoteFinal) {
                        quoteUpdateData.isQuoteFinal = true;
                        if (finalStartDate !== undefined) quoteUpdateData.startDate = finalStartDate;
                        if (finalEndDate !== undefined) quoteUpdateData.endDate = finalEndDate;
                        if (finalLocation !== undefined) quoteUpdateData.location = finalLocation;
                        if (finalEventType !== undefined) quoteUpdateData.eventType = finalEventType;
                        if (finalFlatOrHouseNo !== undefined) quoteUpdateData.flatOrHouseNo = finalFlatOrHouseNo;
                        if (finalStreetName !== undefined) quoteUpdateData.streetName = finalStreetName;
                        if (finalCity !== undefined) quoteUpdateData.city = finalCity;
                        if (finalState !== undefined) quoteUpdateData.state = finalState;
                        if (finalPostalCode !== undefined) quoteUpdateData.postalCode = finalPostalCode;
                        if (finalRequirements !== undefined) quoteUpdateData.requirements = finalRequirements;
                        if (finalEditingPreferences !== undefined) quoteUpdateData.editingPreferences = finalEditingPreferences;
                        if (finalEventDuration !== undefined) quoteUpdateData.eventDuration = finalEventDuration;
                        if (finalQuoteType !== undefined) quoteUpdateData.quoteType = finalQuoteType;
                        if (finalPhoneNumber !== undefined) quoteUpdateData.phoneNumber = finalPhoneNumber;
                        if (finalEmail !== undefined) quoteUpdateData.email = finalEmail;
                        if (finalClientName !== undefined) quoteUpdateData.clientName = finalClientName;
                        if (finalEventDate !== undefined) quoteUpdateData.eventDate = finalEventDate;
                    }

                    if (Object.keys(quoteUpdateData).length > 0) {
                        await Quote.findByIdAndUpdate(targetQuoteId, { $set: quoteUpdateData });
                        console.log(`✅ Quote ${targetQuoteId} updated with ${Object.keys(quoteUpdateData).join(", ")}.`);
                    }
                }
            }

            // Create the message
            const newMessage = await Message.create({
                conversationId: conversation._id,
                senderId: userId,
                message: finalMessage,
                messageType: finalMessageType,
                budget: finalBudget,
                startDate: finalStartDate,
                endDate: finalEndDate,
                location: finalLocation,
                quoteId: targetQuoteId || null,
                eventType: finalEventType,
                flatOrHouseNo: finalFlatOrHouseNo,
                streetName: finalStreetName,
                city: finalCity,
                state: finalState,
                postalCode: finalPostalCode,
                requirements: finalRequirements,
                editingPreferences: finalEditingPreferences,
                currentBudget: finalCurrentBudget,
                previousBudget: finalPreviousBudget,
                eventDuration: finalEventDuration,
                quoteType: finalQuoteType,
                phoneNumber: finalPhoneNumber,
                email: finalEmail,
                clientName: finalClientName,
                eventDate: finalEventDate,
                attachmentUrl: finalAttachmentUrl,
                clientId: finalClientId,
                isAdminRead: req.user.isAdmin ? true : false,
                isQuoteFinal: finalIsQuoteFinal
            });

            // Update conversation last message info
            conversation.lastMessage = finalMessageType === "text" ? finalMessage : `[${finalMessageType}]`;
            conversation.lastMessageAt = new Date();
            await conversation.save();

            // Populate sender details for the response
            await newMessage.populate("senderId", "username avatar");

            const baseUrl = `${req.protocol}://${req.get("host")}`;
            const messageObj = newMessage.toObject();
            if (messageObj.senderId && messageObj.senderId.avatar && !messageObj.senderId.avatar.startsWith("http")) {
                messageObj.senderId.avatar = `${baseUrl}/${messageObj.senderId.avatar.replace(/\\/g, "/")}`;
            }

            // Notify others via socket
            try {
                const io = getIO();
                const roomName = `booking_${refId}`;
                console.log(`📡 Emitting message to room: ${roomName}`);
                io.to(roomName).emit("receive_message", messageObj);

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
            } catch (socketErr) {
                console.error("❌ Socket notification failed:", socketErr.message);
            }

            return res.status(201).json({ success: true, data: messageObj });
        } catch (err) {
            next(err);
        }
    }
}

export default new ChatController();
