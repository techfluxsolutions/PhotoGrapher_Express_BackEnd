
import ServiceBooking from "../../models/ServiceBookings.mjs";
import Gallery from "../../models/Gallery.mjs";
import {
    sendErrorResponse,
    sendSuccessResponse,
} from "../../utils/handleResponce.mjs";
import fs from 'fs';
import path from 'path';

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
                    .populate("client_id", "username email mobileNumber avatar")
                    .populate("service_id", "name")
                    .populate("additionalServicesId")
                    .populate("photographer_id", "username")
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                ServiceBooking.countDocuments(filter),
            ]);

            // Fetch galleries for these bookings (Optional: typically list view doesn't show full gallery, maybe just count or boolean)
            // For list view, we might not need gallery details.

            return sendSuccessResponse(res, {
                bookings,
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
                .populate("service_id")
                .populate("additionalServicesId")
                .populate("photographer_id", "username");

            if (!booking) {
                return sendErrorResponse(res, { message: "Booking not found" }, 404);
            }

            const gallery = await Gallery.findOne({ booking_id: id });

            return sendSuccessResponse(res, {
                booking,
                gallery: gallery ? gallery : null
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

    // Upload Gallery
    async uploadGallery(req, res) {
        try {
            const { id } = req.params;
            const files = req.files;

            if (!files || files.length === 0) {
                return sendErrorResponse(res, { message: "No files uploaded" }, 400);
            }

            const booking = await ServiceBooking.findById(id).populate("client_id");
            if (!booking) {
                // cleanup temp files
                files.forEach(file => {
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                });
                return sendErrorResponse(res, { message: "Booking not found" }, 404);
            }

            // Ensure client exists
            if (!booking.client_id) {
                files.forEach(file => {
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                });
                return sendErrorResponse(res, { message: "Booking has no associated client" }, 400);
            }

            const clientId = booking.client_id._id.toString();
            const bookingId = booking._id.toString();

            // Define target directory: uploads/users/{clientId}/bookings/{bookingId}/
            const targetDir = path.join("uploads", "users", clientId, "bookings", bookingId);

            // Ensure target directory exists
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const newGalleryPaths = [];

            // Move files
            for (const file of files) {
                const newFilename = path.basename(file.path);
                const targetPath = path.join(targetDir, newFilename);

                fs.renameSync(file.path, targetPath);

                // Store relative path "uploads/users/..."
                newGalleryPaths.push(targetPath.replace(/\\/g, "/"));
            }

            // Update or Create Gallery
            let gallery = await Gallery.findOne({ booking_id: bookingId });

            if (!gallery) {
                gallery = new Gallery({
                    booking_id: bookingId,
                    gallery: newGalleryPaths,
                });
            } else {
                gallery.gallery.push(...newGalleryPaths);
            }

            await gallery.save();

            return sendSuccessResponse(res, {
                gallery
            }, "Gallery uploaded successfully");

        } catch (error) {
            // cleanup temp files in case of error
            if (req.files) {
                req.files.forEach(file => {
                    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
                });
            }
            return sendErrorResponse(res, error, 500);
        }
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
}

export default new BookingController();
