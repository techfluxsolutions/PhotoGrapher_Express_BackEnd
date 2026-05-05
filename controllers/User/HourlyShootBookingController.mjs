import mongoose from "mongoose";
import ServiceBooking from "../../models/ServiceBookings.mjs";
import Counter from "../../models/Counter.mjs";
import Quote from "../../models/Quote.mjs";

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
            subCategoryName: (booking.cartId?.items?.[0]?.subCategoryName || booking.editingbookings?.[0]?.subCategoryName || booking.editingPackages?.[0]?.subCategoryName || booking.hourlyPackages?.[0]?.subCategoryName || ""),
            subCategoryType: (booking.cartId?.items?.[0]?.subCategoryType || booking.editingbookings?.[0]?.subCategoryType || booking.editingPackages?.[0]?.subCategoryType || booking.hourlyPackages?.[0]?.subCategoryType || ""),
            hours: booking.hours,
            address: booking.address,
            requirements: booking.requirements || "No requirements",
        };
    }

    async paginateBookings(filter, page, limit, skip) {
        filter.serviceCategory = "hourly";

        const [bookings, total] = await Promise.all([
            ServiceBooking.find(filter)
                .populate("client_id", "username mobileNumber email avatar")
                .populate({
                    path: "cartId",
                    populate: { path: "items.planId" }
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),

            ServiceBooking.countDocuments(filter),
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
            payload.client_id = payload.client_id || req.user.id;

            // Get next booking sequence atomically
            const counter = await Counter.findByIdAndUpdate(
                "veroaBookingId",
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            const nextNumber = counter.seq;

            // Pad number to 6 digit
            const formattedNumber = String(nextNumber).padStart(6, "0");

            payload.veroaBookingId = `VEROA-BK-${formattedNumber}`;
            payload.serviceCategory = payload.serviceCategory || (payload.totalEditingVideos > 0 || (payload.editingbookings && payload.editingbookings.length > 0) ? "editing" : "hourly");

            // Ensure bookingDate is set for sorting/filtering
            if (payload.date) {
                const parsedDate = new Date(payload.date);
                if (!isNaN(parsedDate.getTime())) {
                    payload.bookingDate = parsedDate;
                }
            }

            const booking = await ServiceBooking.create(payload);

            return res.status(201).json({
                success: true,
                data: booking,
                message: `${payload.serviceCategory.charAt(0).toUpperCase() + payload.serviceCategory.slice(1)} booking created successfully`,
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
            const booking = await ServiceBooking.findOne({ _id: req.params.id, serviceCategory: "hourly" })
                .populate("client_id", "username mobileNumber email avatar")
                .populate({
                    path: "cartId",
                    populate: { path: "items.planId" }
                });

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

            const updated = await ServiceBooking.findOneAndUpdate(
                { _id: id, serviceCategory: "hourly" },
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

    /* ---------------------------------------------------------
     CREATE QUOTE BY USER AND ADMIN  
 --------------------------------------------------------- */

    async createhourlyShookQuote(req, res) {
        try {
            const {
                name,
                category,
                date,
                city,
                requirement,
                additionalDetails,
                // Fallbacks in case frontend still sends older keys
                clientName,
                eventType,
                startDate,
                location,
                photographyRequirements,
                serviceCategory,
                subCategory
            } = req.body;

            const clientId = req.user?.id || req.body.clientId;

            if (!clientId) {
                return res.status(400).json({ success: false, message: "Client ID is required." });
            }

            const finalName = name || clientName;
            const finalCity = city || location;
            let finalCategory = category || eventType;

            const payload = {
                clientId,
                clientName: finalName,
                city: finalCity,
                location: finalCity,
                bStatus: "pending",
                quoteStatus: "pending",
                serviceCategory: serviceCategory || "hourly",
                subCategory: subCategory || "",
                quoteType: "personalizedQuotes" // Matching the Quote schema enum
            };

            // Formatting Date for Hourly (Editing might not have date)
            const finalDate = date || startDate;
            if (finalDate) {
                const parseDate = (d) => {
                    if (d.includes("-")) {
                        const parts = d.split("-");
                        if (parts[2]?.length === 4) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // DD-MM-YYYY
                    }
                    return new Date(d);
                };
                payload.startDate = parseDate(finalDate);
                payload.eventDate = payload.startDate;
            }

            // Format Requirements Array
            let reqArray = [];
            if (Array.isArray(requirement)) {
                reqArray = requirement;
            } else if (requirement) {
                reqArray = [requirement];
            } else if (photographyRequirements && typeof photographyRequirements === 'string') {
                reqArray = [photographyRequirements]; // fallback for frontend
            } else if (Array.isArray(photographyRequirements)) {
                reqArray = photographyRequirements;
            }

            payload.requirements = reqArray;

            // Differentiate between Hourly and Editing
            if (finalCategory) {
                // Hourly Case (or if category is explicitly provided)
                payload.eventType = finalCategory;
            } else {
                // Editing Case (category is missing)
                payload.eventType = "Editing";
                payload.serviceCategory = "editing";
                payload.editingPreferences = true;
                if (additionalDetails) {
                    payload.photographyRequirements = additionalDetails;
                }
            }

            const quote = await Quote.create(payload);

            return res.status(201).json({
                success: true,
                message: "Quote created successfully",
                data: quote
            });
        } catch (error) {
            console.error("Error creating hourly/editing quote:", error);
            return res.status(500).json({ success: false, message: error.message || "Failed to create quote" });
        }
    }
}

export default new HourlyShootBookingController();