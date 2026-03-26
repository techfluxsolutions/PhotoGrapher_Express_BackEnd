
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
    // Helper to format date to IST (Separate Date and Time)
    formatIST(date, fallbackDate = null) {
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
    }

    // Helper to format date to DD/MM/YYYY
    formatDMY(dateString) {
        if (!dateString) return null;
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString; // Return as is if already a string like "20-03-2026"
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

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
                        const todayMidnight = new Date();
                        todayMidnight.setUTCHours(0, 0, 0, 0);
                        const todayStr = todayMidnight.toISOString().split("T")[0];

                        // Match completed OR past dates
                        filter.$or = [
                            { status: "completed" },
                            { bookingDate: { $lt: todayMidnight } },
                            { startDate: { $lt: todayStr } }
                        ];
                        const otherStatuses = statuses.filter(s => s !== "completed");
                        if (otherStatuses.length > 0) {
                            // If they asked for completed + others? (Unusual but handleable)
                            // We already set filter.$or, merging other statuses might be complex
                            // For simplicity in this common case:
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

            // Strict Date Range Filter
            const { startDate, endDate } = req.query;
            if (startDate || endDate) {
                if (!startDate || !endDate) {
                    return res.status(200).json({ success: false, message: "Both startDate and endDate must be provided." });
                }
                const sDate = new Date(startDate);
                const eDate = new Date(endDate);
                if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) {
                    return res.status(200).json({ success: false, message: "Invalid startDate or endDate format." });
                }
                if (sDate > eDate) {
                    return res.status(200).json({ success: false, message: "startDate cannot be greater than endDate." });
                }

                sDate.setUTCHours(0, 0, 0, 0);
                eDate.setUTCHours(23, 59, 59, 999);
                const fs = sDate.toISOString().split("T")[0];
                const ts = eDate.toISOString().split("T")[0];

                if (filter.$or) {
                    // Wrap existing $or in $and if it exists to avoid conflicts
                    const existingOr = filter.$or;
                    delete filter.$or;
                    filter.$and = [{ $or: existingOr }];
                } else if (filter.$and) {
                    // Already an $and, just push
                } else {
                    filter.$and = [];
                }

                filter.$and.push({
                    $or: [
                        { bookingDate: { $gte: sDate, $lte: eDate } },
                        { startDate: { $gte: fs, $lte: ts } }
                    ]
                });
            }

            const [bookings, total] = await Promise.all([
                ServiceBooking.find(filter)
                    .select("-gallery -images")
                    .populate("client_id", "username email mobileNumber avatar state city isVerified")
                    .populate("service_id", "serviceName")
                    .populate("photographer_id", "username")
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                ServiceBooking.countDocuments(filter),
            ]);


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
                const ist = this.formatIST(booking.bookingDate, booking.startDate || booking.eventDate);

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
                    fromDate: this.formatDMY(booking.startDate || booking.eventDate || booking.bookingDate),
                    toDate: this.formatDMY(booking.endDate || booking.startDate || booking.eventDate || booking.bookingDate),
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

            const myId = new mongoose.Types.ObjectId(req.user.id);
            const filter = {
                _id: id,
                $or: [
                    { photographer_id: myId },
                    { photographerIds: { $in: [myId] } }
                ]
            };

            const booking = await ServiceBooking.findOne(filter)
                .populate("client_id", "username email mobileNumber avatar state city isVerified")
                .populate("service_id", "serviceName") // Ensure serviceName is selected
                .populate("additionalServicesId")
                .populate("photographer_id", "username")
                .populate("quoteId", "requirements");

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

            // Format Status for UI
            if (bookingObj.status === "confirmed") {
                bookingObj.displayStatus = "Confirmed Booking";
            } else if (bookingObj.status === "pending") {
                bookingObj.displayStatus = "Pending Booking";
            } else if (bookingObj.status === "completed") {
                bookingObj.displayStatus = "Completed Booking";
            } else if (bookingObj.status === "canceled") {
                bookingObj.displayStatus = "Canceled Booking";
            } else {
                bookingObj.displayStatus = bookingObj.status;
            }

            // Construct Venue
            const venueParts = [];
            if (bookingObj.flatOrHouseNo) venueParts.push(bookingObj.flatOrHouseNo);
            if (bookingObj.streetName) venueParts.push(bookingObj.streetName);
            if (bookingObj.city) venueParts.push(bookingObj.city);
            bookingObj.venue = venueParts.length > 0 ? venueParts.join(", ") : "N/A";

            // Extract Quote Requirements
            const quoteReqs = booking.quoteId?.requirements;
            if (quoteReqs && Array.isArray(quoteReqs) && quoteReqs.length > 0) {
                bookingObj.requirements = quoteReqs;
            } else {
                bookingObj.requirements = null;
            }

            // If it's already assigned and has a stored amount, use it.
            // Otherwise calculate it on the fly for this viewing photographer.
            let displayAmount = booking.photographerAmount;
            const isInvited = booking.photographerIds && booking.photographerIds.length > 0;
            if (!displayAmount || (isInvited && !booking.photographer_id)) {
                displayAmount = Math.round(booking.totalAmount * (1 - (myComm || 0) / 100));
            }
            bookingObj.photographerAmount = displayAmount;

            const ist = this.formatIST(booking.bookingDate, booking.startDate || booking.eventDate);
            bookingObj.date = ist.date;
            bookingObj.time = ist.time;

            bookingObj.fromDate = this.formatDMY(booking.startDate || booking.eventDate || booking.bookingDate);
            bookingObj.toDate = this.formatDMY(booking.endDate || booking.startDate || booking.eventDate || booking.bookingDate);

            // Export eventDate explicitly for the UI
            bookingObj.eventDate = bookingObj.fromDate;



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
            const myId = new mongoose.Types.ObjectId(req.user.id);

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return sendErrorResponse(res, { message: "Invalid booking ID" }, 400);
            }

            const { bookingStatus, galleryStatus } = req.body;

            // Fetch the booking first to understand current state and avoid filter-only logic
            const targetBooking = await ServiceBooking.findById(id);
            if (!targetBooking) {
                return sendErrorResponse(res, { message: "Booking not found" }, 404);
            }

            // Check if user has any relation to this booking
            const isAssigned = targetBooking.photographer_id?.toString() === myId.toString();
            const isInvited = targetBooking.photographerIds?.some(pid => pid.toString() === myId.toString());

            if (!isAssigned && !isInvited) {
                return sendErrorResponse(res, { message: "Unauthorized: You are not assigned or invited to this booking" }, 403);
            }

            const updateData = {};
            if (bookingStatus && !["accepted", "rejected", "pending"].includes(bookingStatus)) {
                return sendErrorResponse(res, { message: "Invalid booking status" }, 400);
            }

            if (galleryStatus && !["Upload Pending", "Photos Uploaded"].includes(galleryStatus)) {
                return sendErrorResponse(res, { message: "Invalid gallery status" }, 400);
            }

            if (galleryStatus) {
                if (!isAssigned) {
                    return sendErrorResponse(res, { message: "Only the assigned photographer can update gallery status" }, 403);
                }
                updateData.galleryStatus = galleryStatus;
            }

            if (bookingStatus === "accepted") {
                // To claim: must be invited OR be formally assigned
                if (targetBooking.photographer_id && !isAssigned) {
                    return sendErrorResponse(res, {
                        message: "This booking has already been accepted by another photographer."
                    }, 409);
                }

                updateData.bookingStatus = "accepted";
                updateData.status = "confirmed";
                updateData.acceptedAt = new Date();
                updateData.photographer_id = myId;
                updateData.photographerIds = []; // Clear invitations once claimed

                // Determine commission and net payout
                const [photographer, settings] = await Promise.all([
                    Photographer.findById(myId),
                    PlatformSettings.findOne({ type: "commissions" })
                ]);

                if (photographer) {
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
            } else if (bookingStatus === "rejected") {
                if (isAssigned) {
                    // Canceling an already accepted job
                    if (targetBooking.acceptedAt) {
                        const hoursSinceAcceptance = (new Date() - new Date(targetBooking.acceptedAt)) / (1000 * 60 * 60);
                        if (hoursSinceAcceptance > 48) {
                            return sendErrorResponse(res, {
                                message: "You can't reject this booking because 48 hours have passed since acceptance."
                            }, 403);
                        }
                    }
                    updateData.bookingStatus = "rejected";
                    updateData.status = "canceled";
                } else if (isInvited) {
                    // Just rejecting an invitation - remove me from the list so it disappears from my pending list
                    await ServiceBooking.findByIdAndUpdate(id, { $pull: { photographerIds: myId } });
                    return sendSuccessResponse(res, null, "Invitation rejected successfully");
                }
            } else if (bookingStatus === "pending") {
                updateData.bookingStatus = "pending";
            }

            const updatedBooking = await ServiceBooking.findByIdAndUpdate(id, updateData, { new: true });
            return sendSuccessResponse(res, { booking: updatedBooking }, `Booking updated successfully`);
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
    async getBookingCount(req, res, next) {
        try {
            const myId = new mongoose.Types.ObjectId(req.user.id);
            const todaysDate = new Date();
            const upcommingBookingCount = await ServiceBooking.countDocuments({
                photographer_id: myId,
                bookingStatus: "accepted",
                date: {
                    $gte: todaysDate
                }
            });
            const completedBookingCount = await ServiceBooking.countDocuments({
                photographer_id: myId,
                bookingStatus: "completed"
            });
            const uploadPending = await ServiceBooking.countDocuments({
                photographer_id: myId,
                galleryStatus: "Upload Pending"
            })
            const data = {
                upcommingBookingCount,
                completedBookingCount,
                uploadPending,
                totalBookingCount: upcommingBookingCount + completedBookingCount
            }
            return sendSuccessResponse(res, data, "Booking count fetched successfully");
        } catch (error) {
            return sendErrorResponse(res, error, 500);
        }
    }
    async todaysBooking(req, res, next) {
        try {
            const myId = new mongoose.Types.ObjectId(req.user.id);
            const limit = req.query.limit ;
            const skip = req.query.skip || 0;
            console.log(myId)

            const today = new Date().toISOString().split("T")[0]; // "2026-03-25"

            const bookings = await ServiceBooking.find({
                photographer_id: myId,
                bookingStatus: "accepted",
                $or: [
                    { startDate: today },
                    { endDate: today }
                ]
            }).skip(skip).limit(limit)
            .populate("client_id", "username email mobileNumber avatar")
            .populate("service_id", "serviceName");

            const formattedBookings = bookings.map(booking => {
                const ist = this.formatIST(booking.bookingDate, booking.startDate || booking.eventDate);

                return {
                    _id: booking._id,
                    bookingId: booking.veroaBookingId,
                    client_id: booking.client_id,
                    eventType: booking.service_id?.serviceName || "N/A",
                    requirements: booking.notes || "No requirements",
                    date: ist.date,
                    time: ist.time,
                    fromDate: this.formatDMY(booking.startDate || booking.eventDate || booking.bookingDate),
                    toDate: this.formatDMY(booking.endDate || booking.startDate || booking.eventDate || booking.bookingDate),
                    city: booking.city,
                    status: booking.status,
                    bookingStatus: booking.bookingStatus,
                    galleryStatus: booking.galleryStatus || "Upload Pending",
                    totalAmount: booking.totalAmount,
                    photographerAmount: booking.photographerAmount || 0
                };
            });

            return sendSuccessResponse(res, formattedBookings, "Todays bookings fetched successfully");
        } catch (error) {
            return sendErrorResponse(res, error, 500);
        }
    }

    // Get summary counts: todays bookings (today+upcoming), upcomming booking (accepted), completed
    async getSummaryCounts(req, res) {
        try {
            const myId = new mongoose.Types.ObjectId(req.user.id);
            const todayMidnight = new Date();
            todayMidnight.setUTCHours(0, 0, 0, 0);
            const todayStr = todayMidnight.toISOString().split("T")[0];

            const acceptedFilter = {
                $or: [
                    { photographer_id: myId, photographerIds: { $size: 0 } },
                    { photographer_id: myId, bookingStatus: "accepted" }
                ],
                status: { $nin: ["completed", "canceled"] }
            };

            // 1. todaysBookings: Today and upcoming (Today + Future)
            const todaysAndUpcomingCount = await ServiceBooking.countDocuments({
                ...acceptedFilter,
                $or: [
                    { bookingDate: { $gte: todayMidnight } },
                    { startDate: { $gte: todayStr } }
                ]
            });

            // 2. upcommingBooking: Total photographer accepted booking count
            const totalAcceptedCount = await ServiceBooking.countDocuments(acceptedFilter);

            // 3. completed: Completed count (including past date bookings)
            const completedCount = await ServiceBooking.countDocuments({
                photographer_id: myId,
                $or: [
                    { status: "completed" },
                    { bookingDate: { $lt: todayMidnight } },
                    { startDate: { $lt: todayStr } }
                ]
            });

            const data = {
                todaysBookings: todaysAndUpcomingCount,
                upcommingBooking: totalAcceptedCount,
                completed: completedCount
            };

            return sendSuccessResponse(res, data, "Booking summary counts fetched successfully");
        } catch (error) {
            return sendErrorResponse(res, error, 500);
        }
    }

    // Get Today and Upcoming Bookings List: show today's on top and then upcoming
    async getTodayAndUpcomingBookings(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.max(1, parseInt(req.query.limit) || 10);
            const skip = (page - 1) * limit;

            const myId = new mongoose.Types.ObjectId(req.user.id);
            const todayMidnight = new Date();
            todayMidnight.setUTCHours(0, 0, 0, 0);
            const todayStr = todayMidnight.toISOString().split("T")[0];

            const acceptedFilter = {
                $or: [
                    { photographer_id: myId, photographerIds: { $size: 0 } }, // Assigned to me
                    { photographer_id: myId, bookingStatus: "accepted" } // Explicitly accepted by me
                ],
                status: { $nin: ["completed", "canceled"] }
            };

            const query = {
                ...acceptedFilter,
                $or: [
                    { bookingDate: { $gte: todayMidnight } },
                    { startDate: { $gte: todayStr } }
                ]
            };

            const [bookings, total] = await Promise.all([
                ServiceBooking.find(query)
                    .sort({ bookingDate: 1, startDate: 1 }) // Sort by date ASC (Earliest [Today] first)
                    .populate("client_id", "username email mobileNumber avatar")
                    .populate("service_id", "serviceName")
                    .skip(skip)
                    .limit(limit),
                ServiceBooking.countDocuments(query)
            ]);

            const formattedBookings = bookings.map(booking => {
                const ist = this.formatIST(booking.bookingDate, booking.startDate || booking.eventDate);

                return {
                    _id: booking._id,
                    bookingId: booking.veroaBookingId,
                    clientName: booking.client_id?.username,
                    eventType: booking.service_id?.serviceName || "N/A",
                    date: ist.date,
                    time: ist.time,
                    fromDate: this.formatDMY(booking.startDate || booking.eventDate || booking.bookingDate),
                    toDate: this.formatDMY(booking.endDate || booking.startDate || booking.eventDate || booking.bookingDate),
                    city: booking.city                    
                };
            });

            return sendSuccessResponse(res, {
                bookings: formattedBookings,
                meta: { total, page, limit }
            }, "Today and upcoming bookings fetched successfully");
        } catch (error) {
            return sendErrorResponse(res, error, 500);
        }
    }
}

export default new BookingController();
