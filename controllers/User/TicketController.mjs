import Ticket from "../../models/Ticket.mjs";
import mongoose from "mongoose";
const BASE_URL = process.env.BASE_URL;
class TicketController {
    // ✅ CREATE TICKET
    async create(req, res, next) {
        try {
            const payload = req.body;
            if (req.file) {
                payload.attachment = `${BASE_URL}/uploads/ticketAttachments/${req.file.filename}`;
            }

            const ticket = await Ticket.create(payload);

            return res.status(201).json({
                success: true,
                message: "Ticket created successfully",
                data: ticket,
            });
        } catch (error) {
            next(error);
        }
    }

    // ✅ GET ALL TICKETS (with optional filters)
    async getAll(req, res, next) {
        try {
            const {
                status,
                clientId,
                photographerId,
                bookingId,
                page = 1,
                limit = 10,
            } = req.query;

            const filter = {};

            if (status && status !== "") filter.status = status;
            if (clientId && clientId !== "") filter.clientId = clientId;
            if (photographerId && photographerId !== "") filter.photographerId = photographerId;
            if (bookingId && bookingId !== "") filter.bookingId = bookingId;

            const pageNumber = parseInt(page, 10);
            const limitNumber = parseInt(limit, 10);
            const skip = (pageNumber - 1) * limitNumber;

            // Total documents (for pagination meta)
            const totalRecords = await Ticket.countDocuments(filter);

            const tickets = await Ticket.find(filter)
                .populate("serviceId")
                .populate("bookingId")
                .populate("clientId")
                .populate("photographerId")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNumber);

            return res.status(200).json({
                success: true,
                pagination: {
                    totalRecords,
                    currentPage: pageNumber,
                    totalPages: Math.ceil(totalRecords / limitNumber),
                    limit: limitNumber,
                },
                count: tickets.length,
                data: tickets,
            });
        } catch (error) {
            next(error);
        }
    }


    // ✅ GET SINGLE TICKET BY ID
    async getById(req, res, next) {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid ticket ID",
                });
            }

            const ticket = await Ticket.findById(id)
                .populate("serviceId")
                .populate("bookingId")
                .populate("clientId", "name email")
                .populate("photographerId", "name email");

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: "Ticket not found",
                });
            }

            return res.status(200).json({
                success: true,
                data: ticket,
            });
        } catch (error) {
            next(error);
        }
    }

    // ✅ UPDATE TICKET (only payload fields)
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const payload = req.body;
            if (req.file) {
                payload.attachment = `/uploads/ticketAttachments/${req.file.filename}`;
            }

            const ticket = await Ticket.findByIdAndUpdate(
                id,
                { $set: payload },
                {
                    new: true,
                    runValidators: true,
                }
            );

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: "Ticket not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Ticket updated successfully",
                data: ticket,
            });
        } catch (error) {
            next(error);
        }
    }

    // ✅ DELETE TICKET
    async delete(req, res, next) {
        try {
            const { id } = req.params;

            const ticket = await Ticket.findByIdAndDelete(id);

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: "Ticket not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Ticket deleted successfully",
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new TicketController();
