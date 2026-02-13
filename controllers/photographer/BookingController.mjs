
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
    async getAllBookings(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.max(1, parseInt(req.query.limit) || 10);
            const skip = (page - 1) * limit;

            let filter = {};

            // Filter by photographer_id if available (assuming generic approach or passed in query/body/user)
            if (req.user && req.user._id) {
                filter.photographer_id = req.user._id;
            } else if (req.query.photographer_id) {
                filter.photographer_id = req.query.photographer_id;
            }

            // Filter by status if provided
            if (req.query.status) {
                filter.status = req.query.status;
            }

            const [bookings, total] = await Promise.all([
                ServiceBooking.find(filter)
                    .select("-gallery -images") // Optimize: Exclude heavy fields
                    .populate("client_id", "username email mobileNumber avatar")
                    .populate("service_id", "serviceName") // Select serviceName for Event Type
                    .populate("additionalServicesId")
                    .populate("photographer_id", "username")
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                ServiceBooking.countDocuments(filter),
            ]);

            // Fetch galleries for these bookings (Optional: typically list view doesn't show full gallery, maybe just count or boolean)
            // For list view, we might not need gallery details.

            // Format response to match UI requirements
            const formattedBookings = bookings.map(booking => ({
                _id: booking._id,
                bookingId: booking.veroaBookingId,
                client_id: booking.client_id,
                eventType: booking.service_id?.serviceName || "N/A", // Map Service Name to Event Type
                requirements: booking.notes || "No requirements", // Map Notes to Requirements
                date: booking.bookingDate,
                city: booking.city,
                status: booking.status,
                daysLeft: "Calculated Frontend", // Frontend logically handles this, but we can compute if needed
                // data: booking // original data if needed
            }));

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
            let bookingObj = booking.toObject();
            bookingObj.eventType = booking.service_id?.serviceName || "N/A";
            bookingObj.requirements = booking.notes || "No requirements";

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

    // Download Invoice
    async downloadInvoice(req, res, next) {
        // Delegate to InvoiceController logic
        return downloadInvoice(req, res, next);
    }
}

export default new BookingController();
