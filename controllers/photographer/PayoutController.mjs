import Payout from "../../models/Payout.mjs";
import ServiceBooking from "../../models/ServiceBookings.mjs";
// import Photographer from "../../models/Photographer.mjs"; // Unused currently but might be useful

class PayoutController {
    // Get all payouts for the authenticated photographer
    async getAll(req, res, next) {
        try {
            // Assuming req.photographer.id is populated by middleware
            // If not, we might need to adjust based on how auth is handled (req.user or req.photographer)
            // Based on photographerRoutes.mjs, it uses 'isPhotographer' middleware, likely setting req.photographer or req.user
            const photographerId = req.user?.id || req.user?._id || req.photographer?._id;

            if (!photographerId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            // Optional filter by Booking ID
            const filter = { photographer_id: photographerId };
            if (req.query.booking_id) {
                filter.booking_id = req.query.booking_id;
            }

            // Populate details to match the requested view (Client Name, Event Type, etc.)
            const payouts = await Payout.find(filter)
                .populate({
                    path: "booking_id",
                    select: "veroaBookingId bookingDate eventType totalAmount status",
                    populate: {
                        path: "client_id",
                        select: "username email" // Getting client name (username as fallback)
                    }
                })
                .sort({ createdAt: -1 });

            // Add invoice download URL
            const payoutsWithInvoice = payouts.map(payout => {
                const p = payout.toObject();
                if (p.booking_id && p.booking_id._id) {
                    p.invoice_download_url = `/api/photographers/invoices/${p.booking_id._id}`;
                }
                return p;
            });

            res.status(200).json({ success: true, data: payoutsWithInvoice });
        } catch (error) {
            next(error);
        }
    }

    // Get a single payout by ID
    async getOne(req, res, next) {
        try {
            const { id } = req.params;
            const payout = await Payout.findById(id)
                .populate({
                    path: "booking_id",
                    select: "veroaBookingId bookingDate eventType totalAmount status",
                    populate: {
                        path: "client_id",
                        select: "username email"
                    }
                });

            if (!payout) {
                return res.status(404).json({ success: false, message: "Payout not found" });
            }

            const payoutObj = payout.toObject();
            if (payoutObj.booking_id && payoutObj.booking_id._id) {
                payoutObj.invoice_download_url = `/api/photographers/invoices/${payoutObj.booking_id._id}`;
            }

            res.status(200).json({ success: true, data: payoutObj });
        } catch (error) {
            next(error);
        }
    }

    // Create a new payout record (Manually, if needed, or trigger based)
    async create(req, res, next) {
        try {
            const { booking_id, total_amount, paid_amount, status } = req.body;
            const photographerId = req.user?.id || req.user?._id || req.photographer?._id;

            if (!photographerId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            // Check if booking exists (optional security check)
            // Note: We need to import ServiceBooking model at the top
            const booking = await ServiceBooking.findById(booking_id);
            if (!booking) {
                return res.status(404).json({ success: false, message: "Booking not found" });
            }

            // Calculate pending
            const pending_amount = total_amount - (paid_amount || 0);

            const newPayout = await Payout.create({
                photographer_id: photographerId,
                booking_id,
                total_amount,
                paid_amount,
                pending_amount,
                status,
                payout_date: new Date()
            });

            res.status(201).json({ success: true, data: newPayout });
        } catch (error) {
            // Handle duplicate key error for unique compound index
            if (error.code === 11000) {
                return res.status(400).json({ success: false, message: "Payout record already exists for this booking" });
            }
            next(error);
        }
    }

    // Update payout (e.g., adding a payment)
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { paid_amount, status } = req.body;

            // Find first to recalculate pending
            const payout = await Payout.findById(id);
            if (!payout) {
                return res.status(404).json({ success: false, message: "Payout not found" });
            }

            // Update fields if provided
            if (paid_amount !== undefined) {
                payout.paid_amount = paid_amount;
                payout.pending_amount = payout.total_amount - paid_amount;
            }
            if (status) payout.status = status;

            await payout.save();

            res.status(200).json({ success: true, data: payout });
        } catch (error) {
            next(error);
        }
    }

    // Delete payout
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const payout = await Payout.findByIdAndDelete(id);

            if (!payout) {
                return res.status(404).json({ success: false, message: "Payout not found" });
            }

            res.status(200).json({ success: true, message: "Payout deleted successfully" });
        } catch (error) {
            next(error);
        }
    }
    // Update payout by Booking ID
    async updateByBookingId(req, res, next) {
        try {
            const { bookingId } = req.params;
            const { paid_amount, status } = req.body;

            // Find by Booking ID
            const payout = await Payout.findOne({ booking_id: bookingId });

            if (!payout) {
                return res.status(404).json({ success: false, message: "Payout not found for this Booking ID" });
            }

            // Update fields if provided
            if (paid_amount !== undefined) {
                payout.paid_amount = paid_amount;
                payout.pending_amount = payout.total_amount - paid_amount;
            }
            if (status) payout.status = status;

            await payout.save();

            res.status(200).json({ success: true, data: payout });
        } catch (error) {
            next(error);
        }
    }
}

export default new PayoutController();
