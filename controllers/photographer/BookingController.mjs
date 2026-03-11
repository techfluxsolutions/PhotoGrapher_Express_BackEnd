
import mongoose from "mongoose";
import ServiceBooking from "../../models/ServiceBookings.mjs";
import Gallery from "../../models/Gallery.mjs";
import Photographer from "../../models/Photographer.mjs";
import PlatformSettings from "../../models/PlatformSettings.mjs";
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

            const myId = req.user?.id;
            if (!myId) {
                return sendErrorResponse(res, "Unauthorized: Photographer account required", 401);
            }
            const photographerId = new mongoose.Types.ObjectId(myId);

            // Status Filtering: Prioritize forcedStatus (from specific API endpoints)
            const statusToFilter = forcedStatus || req.query.bookingStatus;

            let filter = {};

            if (statusToFilter === "pending") {
                // Shows bookings where I am invited via photographerIds OR specifically assigned to me as pending
                filter = {
                    $or: [
                        { photographerIds: { $in: [photographerId] } },
                        { photographer_id: photographerId, bookingStatus: "pending" }
                    ]
                };
            } else if (statusToFilter === "accepted") {
                // Shows bookings specifically assigned to me alone (direct assignment) OR explicitly accepted
                filter = {
                    $or: [
                        { photographer_id: photographerId, photographerIds: { $size: 0 } },
                        { photographer_id: photographerId, bookingStatus: "accepted" }
                    ]
                };
            } else {
                // For other statuses (completed, rejected), strictly my assigned bookings
                filter.photographer_id = photographerId;
                if (statusToFilter) {
                    const statuses = statusToFilter.split(",").filter(s => s);
                    if (statuses.includes("completed")) {
                        filter.status = "completed";
                        const otherStatuses = statuses.filter(s => s !== "completed");
                        if (otherStatuses.length > 0) {
                            filter.bookingStatus = { $in: otherStatuses };
                        }
                    } else {
                        filter.bookingStatus = statuses.length > 1 ? { $in: statuses } : statuses[0];
                    }
                }
            }

            // Legacy status filter (confirmed, pending, etc.)
            if (req.query.status) {
                filter.status = req.query.status;
            }

            // Date Range Filter
            if (req.query.fromDate && req.query.toDate) {
                const fDate = new Date(req.query.fromDate);
                fDate.setUTCHours(0, 0, 0, 0);
                const tDate = new Date(req.query.toDate);
                tDate.setUTCHours(23, 59, 59, 999);
                const fs = fDate.toISOString().split("T")[0];
                const ts = tDate.toISOString().split("T")[0];

                if (filter.$or) {
                    // Wrap existing $or in $and if it exists to avoid conflicts
                    const existingOr = filter.$or;
                    delete filter.$or;
                    filter.$and = [{ $or: existingOr }];
                } else {
                    filter.$and = filter.$and || [];
                }

                filter.$and.push({
                    $or: [
                        { bookingDate: { $gte: fDate, $lte: tDate } },
                        { startDate: { $gte: fs, $lte: ts } }
                    ]
                });
            }

            const [bookings, total] = await Promise.all([
                ServiceBooking.find(filter)
                    .select("-gallery -images")
                    .populate("client_id", "username email mobileNumber avatar")
                    .populate("service_id", "serviceName")
                    .populate("photographer_id", "username")
                    .sort({ bookingDate: 1 })
                    .skip(skip)
                    .limit(limit),
                ServiceBooking.countDocuments(filter),
            ]);

            // Helper to format date to IST (Separate Date and Time)
            const formatIST = (date, fallbackDate = null) => {
                let d = null;
                if (date) {
                    d = new Date(date);
                } else if (fallbackDate) {
                    d = new Date(fallbackDate);
                }

                if (d && !isNaN(d.getTime())) {
                    const formatted = new Intl.DateTimeFormat("en-IN", {
                        timeZone: "Asia/Kolkata",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true
                    }).format(d).toLowerCase();

                    const [datePart, timePart] = formatted.split(", ");
                    return { date: datePart, time: timePart };
                }

                return { date: "N/A", time: "N/A" };
            };

            // Fetch my commission settings for live calculation of broadcast bookings
            const [me, settings] = await Promise.all([
                Photographer.findById(myId),
                PlatformSettings.findOne({ type: "commissions" })
            ]);
            const global = settings || { initio: 0, elite: 0, pro: 0 };
            const myLevel = me?.professionalDetails?.expertiseLevel || "INITIO";
            let myComm = me?.commissionPercentage;
            if (!myComm) {
                if (myLevel === "INITIO") myComm = global.initio;
                else if (myLevel === "ELITE") myComm = global.elite;
                else if (myLevel === "PRO") myComm = global.pro;
            }

            const formattedBookings = bookings.map(booking => {
                const ist = formatIST(booking.bookingDate, booking.startDate || booking.eventDate);

                // If it's already assigned and has a stored amount, use it.
                // Otherwise calculate it on the fly for this viewing photographer.
                let displayAmount = booking.photographerAmount;
                const isInvited = booking.photographerIds && booking.photographerIds.length > 0;
                if (!displayAmount || (isInvited && !booking.photographer_id)) {
                    displayAmount = Math.round(booking.totalAmount * (1 - (myComm || 0) / 100));
                }

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
                    galleryStatus: booking.galleryStatus || "Upload Pending",
                    photographerAmount: displayAmount,
                    totalAmount: booking.totalAmount, // Optional
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

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return sendErrorResponse(res, { message: "Invalid booking ID" }, 400);
            }

            const filter = { _id: id };
            if (req.user && req.user.id) {
                filter.photographer_id = req.user.id;
            }

            const booking = await ServiceBooking.findOne(filter)
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
                    path.startsWith("http") ? path : `${baseUrl}/${path.replace(/\\/g, "/").replace(/^\//, "")}`
                );
            }

            // Fetch my commission settings for live calculation of broadcast bookings
            const [me, settings] = await Promise.all([
                Photographer.findById(req.user.id),
                PlatformSettings.findOne({ type: "commissions" })
            ]);
            const global = settings || { initio: 0, elite: 0, pro: 0 };
            const myLevel = me?.professionalDetails?.expertiseLevel || "INITIO";
            let myComm = me?.commissionPercentage;
            if (!myComm) {
                if (myLevel === "INITIO") myComm = global.initio;
                else if (myLevel === "ELITE") myComm = global.elite;
                else if (myLevel === "PRO") myComm = global.pro;
            }

            // Enhance response with helper fields while keeping original data
            let bookingObj = booking.toObject({ virtuals: true });
            bookingObj.eventType = booking.service_id?.serviceName || "N/A";
            bookingObj.requirements = booking.notes || "No requirements";

            // If it's already assigned and has a stored amount, use it.
            // Otherwise calculate it on the fly for this viewing photographer.
            let displayAmount = booking.photographerAmount;
            const isInvited = booking.photographerIds && booking.photographerIds.length > 0;
            if (!displayAmount || (isInvited && !booking.photographer_id)) {
                displayAmount = Math.round(booking.totalAmount * (1 - (myComm || 0) / 100));
            }
            bookingObj.photographerAmount = displayAmount;

            // Strictly use booking/event date, not creation date
            let d = null;
            if (booking.bookingDate) {
                d = new Date(booking.bookingDate);
            } else if (booking.startDate || booking.eventDate) {
                d = new Date(booking.startDate || booking.eventDate);
            }

            if (d && !isNaN(d.getTime())) {
                const formatted = new Intl.DateTimeFormat("en-IN", {
                    timeZone: "Asia/Kolkata",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                }).format(d).toLowerCase();
                [bookingObj.date, bookingObj.time] = formatted.split(", ");
            } else {
                bookingObj.date = booking.startDate || booking.eventDate || "N/A";
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

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return sendErrorResponse(res, { message: "Invalid booking ID" }, 400);
            }

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

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return sendErrorResponse(res, { message: "Invalid booking ID" }, 400);
            }

            const booking = await ServiceBooking.findByIdAndUpdate(
                id,
                { status: "canceled" },
                { new: true }
            );

            if (!booking) {
                return sendErrorResponse(res, 404, "Booking not found");
            }

            return sendSuccessResponse(res, booking, "Booking canceled successfully");
        } catch (error) {
            return sendErrorResponse(res, error, 500);
        }
    }

    // Upload Gallery to Server
    async uploadGalleryToServer(req, res) {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return sendErrorResponse(res, { message: "Invalid booking ID" }, 400);
            }

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
                path.startsWith("http") ? path : `${baseUrl}/${path.replace(/\\/g, "/").replace(/^\//, "")}`
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

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return sendErrorResponse(res, { message: "Invalid booking ID" }, 400);
            }

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
                path.startsWith("http") ? path : `${baseUrl}/${path.replace(/\\/g, "/").replace(/^\//, "")}`
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

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return sendErrorResponse(res, { message: "Invalid booking ID" }, 400);
            }

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

    // Get Completed Bookings
    async getCompletedBookings(req, res) {
        return this.getAllBookings(req, res, "completed");
    }


    // Update Booking Status (Accept/Reject)
    async updateBookingStatus(req, res) {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return sendErrorResponse(res, { message: "Invalid booking ID" }, 400);
            }

            const { bookingStatus, galleryStatus } = req.body; // 'accepted', 'rejected' or gallery status updates

            if (bookingStatus && !["accepted", "rejected", "pending"].includes(bookingStatus)) {
                return sendErrorResponse(res, { message: "Invalid booking status" }, 400);
            }

            if (galleryStatus && !["Upload Pending", "Photos Uploaded"].includes(galleryStatus)) {
                return sendErrorResponse(res, { message: "Invalid gallery status" }, 400);
            }

            const updateData = {};
            if (bookingStatus) updateData.bookingStatus = bookingStatus;
            if (galleryStatus) updateData.galleryStatus = galleryStatus;

            // If accepted, also update the main status to confirmed and assign to me
            if (bookingStatus === "accepted") {
                updateData.acceptedAt = new Date(); // Track when it was accepted

                // Determine commission and net payout
                const [targetBooking, photographer, settings] = await Promise.all([
                    ServiceBooking.findById(id),
                    Photographer.findById(req.user.id),
                    PlatformSettings.findOne({ type: "commissions" })
                ]);

                if (targetBooking && photographer) {
                    const global = settings || { initio: 0, elite: 0, pro: 0 };
                    const level = photographer.professionalDetails?.expertiseLevel || "INITIO";
                    let commission = photographer.commissionPercentage;

                    if (!commission) {
                        if (level === "INITIO") commission = global.initio;
                        else if (level === "ELITE") commission = global.elite;
                        else if (level === "PRO") commission = global.pro;
                    }

                    updateData.photographerAmount = Math.round(targetBooking.totalAmount * (1 - (commission || 0) / 100));
                }

                updateData.status = "confirmed";
                updateData.photographer_id = new mongoose.Types.ObjectId(req.user.id);
                updateData.photographerIds = []; // Clear invitations once claimed
            } else if (bookingStatus === "rejected") {
                // Check for 48-hour rejection limit if it was already accepted
                const existingBooking = await ServiceBooking.findById(id);

                if (existingBooking && existingBooking.bookingStatus === "accepted" && existingBooking.acceptedAt) {
                    const hoursSinceAcceptance = (new Date() - new Date(existingBooking.acceptedAt)) / (1000 * 60 * 60);
                    if (hoursSinceAcceptance > 48) {
                        return sendErrorResponse(res, {
                            message: "You can't reject this booking Because 48 hours have passed since acceptance."
                        }, 403);
                    }
                }

                updateData.status = "canceled";
            }

            const myId = new mongoose.Types.ObjectId(req.user.id);
            let filter = { _id: id };

            if (bookingStatus === "accepted") {
                // To claim: must be invited via photographerIds OR be formally assigned to me
                filter = {
                    _id: id,
                    $or: [
                        { photographer_id: myId },
                        { photographerIds: { $in: [myId] } }
                    ]
                };
            } else {
                // Other statuses strictly require ownership
                filter.photographer_id = myId;
            }

            const booking = await ServiceBooking.findOneAndUpdate(
                filter,
                updateData,
                { new: true }
            );

            if (!booking) {
                // If accepting, it might be already claimed by another photographer
                if (bookingStatus === "accepted") {
                    return sendErrorResponse(res, {
                        message: "This booking has already been accepted by another photographer."
                    }, 409);
                }
                return sendErrorResponse(res, { message: "Booking not found or unauthorized to update" }, 404);
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
