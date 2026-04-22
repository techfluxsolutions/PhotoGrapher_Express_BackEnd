import mongoose from "mongoose";
import HourlyShootBooking from "../../models/HourlyShootBooking.mjs";
import Counter from "../../models/Counter.mjs";

class HourlyShootBookingController {

    /* ---------------------------------------------------------
       Helpers
    --------------------------------------------------------- */

    calculateDaysLeft(dateString) {
        if (!dateString) return 0;

        const targetDate = new Date(dateString);
        const today = new Date();

        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);

        const diff = targetDate - today;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        return days > 0 ? days : 0;
    }

    getPagination(req) {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 10);
        const skip = (page - 1) * limit;

        return { page, limit, skip };
    }

    formatBooking(booking) {
        return {
            _id: booking._id,
            bookingId: booking.veroaBookingId,
            clientName: booking.client_id?.username || "N/A",
            clientMobile: booking.client_id?.mobileNumber || "N/A",
            eventType: "Hourly Shoot",
            date: booking.date,
            time: booking.time,
            city: booking.city || "N/A",
            budget: booking.photographerAmount,
            status: booking.status,
            bookingStatus: booking.bookingStatus,
            galleryStatus: booking.galleryStatus,
            daysLeft: this.calculateDaysLeft(booking.date),
            hours: booking.hours,
            address: booking.address,
            requirements: booking.requirements || "No requirements",
        };
    }

    async paginateBookings(filter, page, limit, skip) {

        const [bookings, total] = await Promise.all([
            HourlyShootBooking.find(filter)
                .populate("client_id", "username mobileNumber email avatar")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),

            HourlyShootBooking.countDocuments(filter),
        ]);

        return {
            bookings: bookings.map(b => this.formatBooking(b)),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /* ---------------------------------------------------------
       CREATE BOOKING
    --------------------------------------------------------- */

    async createHourlyBooking(req, res) {
        try {
            const payload = req.body;

            // Get next booking sequence atomically
            const counter = await Counter.findByIdAndUpdate(
                "veroaBookingId",
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            const nextNumber = counter.seq;

            // Pad number to 6 digits
            const formattedNumber = String(nextNumber).padStart(6, "0");

            payload.veroaBookingId = `VEROA-BK-${formattedNumber}`;

            const booking = await HourlyShootBooking.create(payload);

            return res.status(201).json({
                success: true,
                data: booking,
                message: "Hourly booking created successfully",
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }

    /* ---------------------------------------------------------
       UPCOMING BOOKINGS
    --------------------------------------------------------- */

    async getUpcomingBookings(req, res) {
        try {
            const { page, limit, skip } = this.getPagination(req);

            const photographerId = new mongoose.Types.ObjectId(req.user.id);

            const filter = {
                photographer_id: photographerId,
                bookingStatus: "accepted",
                status: { $in: ["pending", "confirmed"] },
            };

            const data = await this.paginateBookings(filter, page, limit, skip);

            return res.status(200).json({
                success: true,
                data,
                message: "Upcoming bookings fetched",
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }

    /* ---------------------------------------------------------
       PREVIOUS BOOKINGS
    --------------------------------------------------------- */

    async getPreviousBookings(req, res) {
        try {
            const { page, limit, skip } = this.getPagination(req);

            const photographerId = new mongoose.Types.ObjectId(req.user.id);

            const filter = {
                photographer_id: photographerId,
                status: { $in: ["completed", "canceled"] },
            };

            const data = await this.paginateBookings(filter, page, limit, skip);

            return res.status(200).json({
                success: true,
                data,
                message: "Previous bookings fetched",
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }

    /* ---------------------------------------------------------
       GET BOOKINGS BY CLIENT
    --------------------------------------------------------- */

    async getBookingsByClientId(req, res) {
        try {
            const { clientId } = req.params;
            const { page, limit, skip } = this.getPagination(req);

            const filter = {
                client_id: new mongoose.Types.ObjectId(clientId),
            };

            const data = await this.paginateBookings(filter, page, limit, skip);

            return res.status(200).json({
                success: true,
                data,
                message: "Client bookings fetched",
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }

    /* ---------------------------------------------------------
       GET BOOKINGS BY PHOTOGRAPHER
    --------------------------------------------------------- */

    async getBookingsByPhotographerId(req, res) {
        try {
            const { photographerId } = req.params;
            const { page, limit, skip } = this.getPagination(req);

            const filter = {
                photographer_id: new mongoose.Types.ObjectId(photographerId),
            };

            const data = await this.paginateBookings(filter, page, limit, skip);

            return res.status(200).json({
                success: true,
                data,
                message: "Photographer bookings fetched",
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }

    /* ---------------------------------------------------------
       GET ALL BOOKINGS (ADMIN)
    --------------------------------------------------------- */

    async getAllBookings(req, res) {
        try {
            const { page, limit, skip } = this.getPagination(req);

            const filter = {};

            const data = await this.paginateBookings(filter, page, limit, skip);

            return res.status(200).json({
                success: true,
                data,
                message: "All bookings fetched",
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }

    /* ---------------------------------------------------------
       GET BOOKING BY ID
    --------------------------------------------------------- */

    async getHourlyBookingById(req, res) {
        try {
            const booking = await HourlyShootBooking.findById(req.params.id)
                .populate("client_id", "username mobileNumber email avatar");

            if (!booking)
                return res.status(404).json({
                    success: false,
                    message: "Booking not found",
                });

            return res.status(200).json({
                success: true,
                data: booking,
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }

    /* ---------------------------------------------------------
       UPDATE BOOKING
    --------------------------------------------------------- */

    async updateBooking(req, res) {
        try {
            const { id } = req.params;

            const updated = await HourlyShootBooking.findByIdAndUpdate(
                id,
                req.body,
                { new: true, runValidators: true }
            );

            if (!updated)
                return res.status(404).json({
                    success: false,
                    message: "Booking not found",
                });

            return res.status(200).json({
                success: true,
                data: updated,
                message: "Booking updated successfully",
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }
}

export default new HourlyShootBookingController();