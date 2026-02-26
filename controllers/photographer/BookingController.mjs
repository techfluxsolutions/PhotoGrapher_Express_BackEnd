
import ServiceBooking from "../../models/ServiceBookings.mjs";
import Gallery from "../../models/Gallery.mjs";
import {
    sendErrorResponse,
    sendSuccessResponse,
} from "../../utils/handleResponce.mjs";
import fs from 'fs';
import path from 'path';
import { downloadInvoice } from "../../controllers/Admin/InvoiceController.mjs";

class BookingController {
    // Get all bookings (with pagination and filter for photographer)
    async getAllBookings(req, res, forcedStatus = null) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.max(1, parseInt(req.query.limit) || 10);
            const skip = (page - 1) * limit;

            let filter = {};

            // Filter by photographer_id if available
            if (req.user && req.user._id) {
                filter.photographer_id = req.user._id;
            }

            // Status Filtering: Prioritize forcedStatus (from specific API endpoints)
            const statusToFilter = forcedStatus || req.query.bookingStatus;

            if (statusToFilter) {
                const statuses = statusToFilter.split(",");
                if (statuses.length > 1) {
                    filter.bookingStatus = { $in: statuses };
                } else if (statuses[0]) {
                    filter.bookingStatus = statuses[0];
                }
            }

            // Legacy status filter (confirmed, pending, etc.)
            if (req.query.status) {
                filter.status = req.query.status;
            }

            const [bookings, total] = await Promise.all([
                ServiceBooking.find(filter)
                    .select("-gallery -images")
                    .populate("client_id", "username email mobileNumber avatar")
                    .populate("service_id", "serviceName")
                    .populate("photographer_id", "username")
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                ServiceBooking.countDocuments(filter),
            ]);

            // Helper to format date to IST (Separate Date and Time)
            const formatIST = (date) => {
                if (!date) return { date: "N/A", time: "N/A" };
                const d = new Date(date);
                const datePart = new Intl.DateTimeFormat("en-IN", {
                    timeZone: "Asia/Kolkata",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }).format(d);

                const timePart = new Intl.DateTimeFormat("en-IN", {
                    timeZone: "Asia/Kolkata",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                }).format(d);

                return { date: datePart, time: timePart };
            };

            const formattedBookings = bookings.map(booking => {
                const ist = formatIST(booking.bookingDate);
                return {
                    _id: booking._id,
                    bookingId: booking.veroaBookingId,
                    client_id: booking.client_id,
                    eventType: booking.service_id?.serviceName || "N/A",
                    requirements: booking.notes || "No requirements",
                    date: ist.date,
                    time: ist.time,
                    city: booking.city,
                    status: booking.status,
                    bookingStatus: booking.bookingStatus,
                    daysLeft: "Calculated Frontend"
                };
            });



            return sendSuccessResponse(res, {
                bookings: formattedBookings,
                meta: { total, page, limit },
            }, "Bookings fetched successfully");
        } catch (error) {
            return sendErrorResponse(res, error, 500);
        }
    }

    // Get booking by ID
    async getBookingById(req, res) {
        try {
            const { id } = req.params;
            const booking = await ServiceBooking.findById(id)
                .populate("client_id", "username email mobileNumber avatar")
                .populate("service_id", "serviceName") // Ensure serviceName is selected
                .populate("additionalServicesId")
                .populate("photographer_id", "username");

            if (!booking) {
                return sendErrorResponse(res, { message: "Booking not found" }, 404);
            }

            const gallery = await Gallery.findOne({ booking_id: id });
            let formattedGallery = null;
            if (gallery) {
                const baseUrl = `${req.protocol}://${req.get("host")}`;
                formattedGallery = gallery.toObject();
                formattedGallery.gallery = formattedGallery.gallery.map(path =>
                    path.startsWith("http") ? path : `${baseUrl}/${path}`
                );
            }

            // Enhance response with helper fields while keeping original data
            let bookingObj = booking.toObject({ virtuals: true });
            bookingObj.eventType = booking.service_id?.serviceName || "N/A";
            bookingObj.requirements = booking.notes || "No requirements";

            // Format IST explicitly to separate Date and Time
            if (booking.bookingDate) {
                const d = new Date(booking.bookingDate);
                bookingObj.date = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
                bookingObj.time = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true }).format(d);
            } else {
                bookingObj.date = "N/A";
                bookingObj.time = "N/A";
            }



            return sendSuccessResponse(res, {
                booking: bookingObj,
                gallery: formattedGallery
            }, "Booking fetched successfully");
        } catch (error) {
            return sendErrorResponse(res, error, 500);
        }
    }

    // Create Booking
    async createBooking(req, res) {
        try {
            const payload = req.body;
            const booking = await ServiceBooking.create(payload);
            return sendSuccessResponse(res, {
                booking,
            }, "Booking created successfully", 201);
        } catch (error) {
            return sendErrorResponse(res, error, 500);
        }
    }

    // Update Booking
    async updateBooking(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const booking = await ServiceBooking.findByIdAndUpdate(id, updates, {
                new: true,
            })
                .populate("client_id", "username email mobileNumber avatar")
                .populate("service_id");

            if (!booking) {
                return sendErrorResponse(res, { message: "Booking not found" }, 404);
            }

            return sendSuccessResponse(res, {
                booking,
            }, "Booking updated successfully");
        } catch (error) {
            return sendErrorResponse(res, error, 500);
        }
    }

    // Delete Booking
    async deleteBooking(req, res) {
        try {
            const { id } = req.params;
            const booking = await ServiceBooking.findByIdAndDelete(id);

            if (!booking) {
                return sendErrorResponse(res, 404, "Booking not found");
            }

            return sendSuccessResponse(res, null, "Booking deleted successfully");
        } catch (error) {
            return sendErrorResponse(res, error, 500);
        }
    }

    // Upload Gallery to Server
    async uploadGalleryToServer(req, res) {
        try {
            const { id } = req.params;
            const files = req.files;

            if (!files || files.length === 0) {
                return sendErrorResponse(res, { message: "No files uploaded" }, 400);
            }

            const booking = await ServiceBooking.findById(id).populate("client_id");
            if (!booking) {
                files.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
                return sendErrorResponse(res, { message: "Booking not found" }, 404);
            }

            if (!booking.client_id) {
                files.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
                return sendErrorResponse(res, { message: "Booking has no associated client" }, 400);
            }

            const clientId = booking.client_id._id.toString();
            const bookingId = booking._id.toString();
            const targetDir = path.join("uploads", "users", clientId, "bookings", bookingId);

            if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

            const newGalleryPaths = [];
            for (const file of files) {
                const newFilename = path.basename(file.path);
                const targetPath = path.join(targetDir, newFilename);
                fs.renameSync(file.path, targetPath);
                newGalleryPaths.push(targetPath.replace(/\\/g, "/"));
            }

            let gallery = await Gallery.findOne({ booking_id: bookingId });
            if (!gallery) {
                gallery = new Gallery({
                    booking_id: bookingId,
                    gallery: newGalleryPaths,
                    storageType: "server"
                });
            } else {
                gallery.gallery.push(...newGalleryPaths);
                gallery.storageType = "server"; // Update if changed
            }

            await gallery.save();

            const baseUrl = `${req.protocol}://${req.get("host")}`;
            const galleryData = gallery.toObject();
            galleryData.gallery = galleryData.gallery.map(path =>
                path.startsWith("http") ? path : `${baseUrl}/${path}`
            );

            return sendSuccessResponse(res, { gallery: galleryData }, "Gallery uploaded to server successfully");
        } catch (error) {
            if (req.files) req.files.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
            return sendErrorResponse(res, error, 500);
        }
    }

    // Upload Gallery to Cloud (Placeholder for Cloud integration)
    async uploadGalleryToCloud(req, res) {
        try {
            const { id } = req.params;
            const files = req.files;

            if (!files || files.length === 0) {
                return sendErrorResponse(res, { message: "No files uploaded" }, 400);
            }

            const booking = await ServiceBooking.findById(id);
            if (!booking) {
                files.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
                return sendErrorResponse(res, { message: "Booking not found" }, 404);
            }

            /**
             * NOTE: Implement Cloud Upload Logic Here (e.g., AWS S3, Cloudinary, etc.)
             * 1. Upload files to Cloud Provider.
             * 2. Get the URLs returned by the Cloud Provider.
             * 3. Save those URLs in the Gallery model.
             */

            // Simulating Cloud Upload by using temp paths for now
            const cloudUrls = files.map(file => `cloud_placeholder/${file.filename}`);

            let gallery = await Gallery.findOne({ booking_id: id });
            if (!gallery) {
                gallery = new Gallery({
                    booking_id: id,
                    gallery: cloudUrls,
                    storageType: "cloud"
                });
            } else {
                gallery.gallery.push(...cloudUrls);
                gallery.storageType = "cloud";
            }

            await gallery.save();

            // Cleanup temp files as they are supposedly "uploaded"
            files.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });

            const baseUrl = `${req.protocol}://${req.get("host")}`;
            const galleryData = gallery.toObject();
            galleryData.gallery = galleryData.gallery.map(path =>
                path.startsWith("http") ? path : `${baseUrl}/${path}`
            );

            return sendSuccessResponse(res, { gallery: galleryData }, "Gallery uploaded to cloud successfully (Simulation)");
        } catch (error) {
            if (req.files) req.files.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
            return sendErrorResponse(res, error, 500);
        }
    }

    // Original Upload Gallery (Kept for compatibility, defaults to server)
    async uploadGallery(req, res) {
        return this.uploadGalleryToServer(req, res);
    }


    // Share Gallery
    async shareGallery(req, res) {
        try {
            const { id } = req.params;

            // Find Gallery by booking_id
            let gallery = await Gallery.findOne({ booking_id: id });

            if (!gallery) {
                return sendErrorResponse(res, { message: "Gallery not found for this booking" }, 404);
            }

            gallery.isShared = true;
            await gallery.save();

            return sendSuccessResponse(res, { gallery }, "Gallery shared with user successfully");

        } catch (error) {
            return sendErrorResponse(res, error, 500);
        }
    }

    // Get Pending Bookings
    async getPendingBookings(req, res) {
        return this.getAllBookings(req, res, "pending");
    }

    // Get Accepted Bookings
    async getAcceptedBookings(req, res) {
        return this.getAllBookings(req, res, "accepted");
    }

    // Get Rejected Bookings
    async getRejectedBookings(req, res) {
        return this.getAllBookings(req, res, "rejected");
    }

    // Update Booking Status (Accept/Reject)
    async updateBookingStatus(req, res) {
        try {
            const { id } = req.params;
            const { bookingStatus } = req.body; // 'accepted' or 'rejected'

            if (!["accepted", "rejected", "pending"].includes(bookingStatus)) {
                return sendErrorResponse(res, { message: "Invalid booking status" }, 400);
            }

            const updateData = { bookingStatus };

            // If accepted, also update the main status to confirmed
            if (bookingStatus === "accepted") {
                updateData.status = "confirmed";
            } else if (bookingStatus === "rejected") {
                updateData.status = "canceled";
            }

            const booking = await ServiceBooking.findByIdAndUpdate(
                id,
                updateData,
                { new: true }
            );

            if (!booking) {
                return sendErrorResponse(res, { message: "Booking not found" }, 404);
            }

            return sendSuccessResponse(res, { booking }, `Booking ${bookingStatus} successfully`);
        } catch (error) {
            return sendErrorResponse(res, error, 500);
        }
    }

    // Initialize/Update previous bookings to have 'pending' status
    async initializePreviousBookingsStatus(req, res) {
        try {
            const result = await ServiceBooking.updateMany(
                { bookingStatus: { $exists: false } }, // Or those that are null/empty
                { $set: { bookingStatus: "pending" } }
            );
            return sendSuccessResponse(res, result, "Previous bookings updated successfully");
        } catch (error) {
            return sendErrorResponse(res, error, 500);
        }
    }

    // Download Invoice
    async downloadInvoice(req, res, next) {
        // Delegate to InvoiceController logic
        return downloadInvoice(req, res, next);
    }
}

export default new BookingController();
