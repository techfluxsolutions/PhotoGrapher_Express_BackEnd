
import mongoose from "mongoose";
import ServiceBooking from "../../models/ServiceBookings.mjs";
import Gallery from "../../models/Gallery.mjs";
import Photographer from "../../models/Photographer.mjs";
import User from "../../models/User.mjs";
import PlatformSettings from "../../models/PlatformSettings.mjs";
import {
    sendErrorResponse,
    sendSuccessResponse,
} from "../../utils/handleResponce.mjs";
import fs from 'fs';
import path from 'path';
import { sendBookingSMS, sendMessageCentral, retryMessageCentral, verifyMessageCentral } from "../../utils/messageCentral.mjs";
import { downloadInvoice, downloadPartnerInvoice } from "../../controllers/Admin/InvoiceController.mjs";

class BookingController {
    // Helper to calculate days left until the event
    calculateDaysLeft(date) {
        if (!date) return 0;
        const targetDate = new Date(date);
        const today = new Date();

        // Reset time parts to compare just dates
        today.setHours(0, 0, 0, 0);
        targetDate.setHours(0, 0, 0, 0);

        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Return 0 if the date has passed or is today
        return diffDays > 0 ? diffDays : 0;
    }

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
                // Shows bookings specifically assigned to me and explicitly accepted/confirmed
                // Includes TODAY and FUTURE dates
                const now = new Date();
                const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
                const todayStartIST = new Date(`${todayStr}T00:00:00.000+05:30`);

                filter = {
                    photographer_id: photographerId,
                    bookingStatus: "accepted",
                    status: { $nin: ["completed", "canceled"] },
                    // Removed payment restriction to show all accepted work
                    $or: [
                        { bookingDate: { $gte: todayStartIST } },
                        { startDate: { $gte: todayStr } }
                    ]
                };
            } else {
                // For other statuses (completed, rejected), strictly my assigned bookings
                filter.photographer_id = photographerId;
                if (statusToFilter) {
                    const statuses = statusToFilter.split(",").filter(s => s);
                    if (statuses.includes("completed")) {
                        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
                        const todayStartIST = new Date(`${todayStr}T00:00:00.000+05:30`);

                        // Match completed OR past dates, but never canceled
                        filter.status = { $ne: "canceled" };
                        filter.$or = [
                            { status: "completed" },
                            { bookingDate: { $lt: todayStartIST } },
                            { startDate: { $lt: todayStr } }
                        ];
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

            // --- Search Filter (Client Name or Veroa ID) ---
            const { search } = req.query;
            if (search) {
                const searchRegex = new RegExp(search, "i");

                // Find clients whose username matches search
                const matchingClients = await User.find({ username: searchRegex }).select("_id");
                const clientIds = matchingClients.map(c => c._id);

                const searchOr = [
                    { veroaBookingId: searchRegex }
                ];
                if (clientIds.length > 0) {
                    searchOr.push({ client_id: { $in: clientIds } });
                }

                if (filter.$and) {
                    filter.$and.push({ $or: searchOr });
                } else if (filter.$or) {
                    const existingOr = filter.$or;
                    delete filter.$or;
                    filter.$and = [{ $or: existingOr }, { $or: searchOr }];
                } else {
                    filter.$or = searchOr;
                }
            }

            const [bookings, total] = await Promise.all([
                ServiceBooking.find(filter)
                    .select("-gallery -images")
                    .populate("client_id", "username email mobileNumber avatar state city isVerified")
                    .populate("service_id", "serviceName")
                    .populate("photographer_id", "username")
                    .populate("quoteId", "requirements photographyRequirements")
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

                // Construct Venue if address is missing
                const displayAddress = booking.address || booking.location || ""

                return {
                    _id: booking._id,
                    bookingId: booking.veroaBookingId,
                    clientName: booking.client_id?.username || "N/A",
                    clientAvatar: booking.client_id?.avatar || null,
                    client_id: booking.client_id, // Keep original client_id nested too for compatibility
                    eventType: booking.service_id?.serviceName || "N/A",
                    requirements: booking.notes || (booking.quoteId?.requirements?.length > 0 ? booking.quoteId.requirements.join(", ") : booking.quoteId?.photographyRequirements) || "No requirements",
                    date: ist.date,
                    time: ist.time,
                    fromDate: this.formatDMY(booking.startDate || booking.eventDate || booking.bookingDate),
                    toDate: this.formatDMY(booking.endDate || booking.startDate || booking.eventDate || booking.bookingDate),
                    city: booking.city,
                    lat: booking.lat || null,
                    lng: booking.lng || null,
                    address: displayAddress,
                    status: booking.status,
                    bookingStatus: booking.bookingStatus,
                    galleryStatus: booking.galleryStatus || "Upload Pending",
                    photographerAmount: displayAmount,
                    budget: displayAmount,
                    totalAmount: booking.totalAmount, // Optional
                    daysLeft: this.calculateDaysLeft(booking.startDate || booking.eventDate || booking.bookingDate),
                    daysRemaining: this.calculateDaysLeft(booking.startDate || booking.eventDate || booking.bookingDate)
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

    // Get ALL bookings for the photographer (Assignments + Invitations, No date limits)
    async getAllMyBookings(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.max(1, parseInt(req.query.limit) || 20);
            const skip = (page - 1) * limit;

            const myId = req.user?.id;
            if (!myId) {
                return sendErrorResponse(res, "Unauthorized: Photographer account required", 401);
            }
            const photographerId = new mongoose.Types.ObjectId(myId);

            const filter = {
                $or: [
                    { photographer_id: photographerId },
                    { photographerIds: { $in: [photographerId] } }
                ]
            };

            const [bookings, total] = await Promise.all([
                ServiceBooking.find(filter)
                    .select("-gallery -images")
                    .populate("client_id", "username email mobileNumber avatar city")
                    .populate("service_id", "serviceName")
                    .populate("photographer_id", "username")
                    .populate("quoteId", "requirements photographyRequirements")
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),
                ServiceBooking.countDocuments(filter),
            ]);

            const formattedBookings = bookings.map(booking => {
                const ist = this.formatIST(booking.bookingDate, booking.startDate || booking.eventDate);
                return {
                    _id: booking._id,
                    bookingId: booking.veroaBookingId,
                    clientName: booking.client_id?.username || "N/A",
                    clientAvatar: booking.client_id?.avatar || null,
                    requirements: booking.notes || (booking.quoteId?.requirements?.length > 0 ? booking.quoteId.requirements.join(", ") : booking.quoteId?.photographyRequirements) || "No requirements",
                    eventType: booking.service_id?.serviceName || "N/A",
                    date: ist.date,
                    time: ist.time,
                    fromDate: this.formatDMY(booking.startDate || booking.eventDate || booking.bookingDate),
                    toDate: this.formatDMY(booking.endDate || booking.startDate || booking.eventDate || booking.bookingDate),
                    city: booking.city,
                    address: booking.address || booking.location || "",
                    status: booking.status,
                    bookingStatus: booking.bookingStatus,
                    galleryStatus: booking.galleryStatus || "Upload Pending",
                    photographerAmount: booking.photographerAmount || 0,
                    budget: booking.photographerAmount || 0,
                    totalAmount: booking.totalAmount,
                    daysLeft: this.calculateDaysLeft(booking.startDate || booking.eventDate || booking.bookingDate),
                    daysRemaining: this.calculateDaysLeft(booking.startDate || booking.eventDate || booking.bookingDate)
                };
            });

            return sendSuccessResponse(res, {
                bookings: formattedBookings,
                meta: { total, page, limit },
            }, "All bookings fetched successfully");
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
            bookingObj.address = bookingObj.address || (venueParts.length > 0 ? venueParts.join(", ") : null);
            bookingObj.venue = bookingObj.address || "N/A";
            bookingObj.lat = booking.lat || null;
            bookingObj.lng = booking.lng || null;

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
            bookingObj.budget = displayAmount;

            const ist = this.formatIST(booking.bookingDate, booking.startDate || booking.eventDate);
            bookingObj.date = ist.date;
            bookingObj.time = ist.time;

            bookingObj.fromDate = this.formatDMY(booking.startDate || booking.eventDate || booking.bookingDate);
            bookingObj.toDate = this.formatDMY(booking.endDate || booking.startDate || booking.eventDate || booking.bookingDate);

            // Export eventDate explicitly for the UI
            bookingObj.eventDate = bookingObj.fromDate;
            bookingObj.daysLeft = this.calculateDaysLeft(booking.startDate || booking.eventDate || booking.bookingDate);
            bookingObj.daysRemaining = bookingObj.daysLeft;



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
                console.log("Photographer accepting booking:", { id, updateData });

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
                    updateData.photographer_id = null; // Remove as assigned photographer
                    updateData.bookingOtp = null;      // Clear OTP
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

    // Download Invoices
    async downloadCustomerInvoice(req, res, next) {
        try {
            const booking = await ServiceBooking.findById(req.params.bookingId);
            if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

            // Check authorization
            if (booking.photographer_id?.toString() !== req.user.id && !booking.photographerIds?.includes(req.user.id)) {
                return res.status(403).json({ success: false, message: "Unauthorized to view this invoice" });
            }

            return downloadInvoice(req, res, next);
        } catch (err) {
            next(err);
        }
    }

    async downloadPartnerInvoice(req, res, next) {
        try {
            const booking = await ServiceBooking.findById(req.params.bookingId);
            if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

            // Check authorization
            if (booking.photographer_id?.toString() !== req.user.id) {
                return res.status(403).json({ success: false, message: "Unauthorized: Only the assigned photographer can download their receipt" });
            }

            return downloadPartnerInvoice(req, res, next);
        } catch (err) {
            next(err);
        }
    }
    async getBookingCount(req, res, next) {
        try {
            const myId = new mongoose.Types.ObjectId(req.user.id);
            const now = new Date();
            const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
            const todayStartIST = new Date(`${todayStr}T00:00:00.000+05:30`);
            
            const tomorrowIST = new Date(todayStartIST);
            tomorrowIST.setDate(tomorrowIST.getDate() + 1);
            const tomorrowStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(tomorrowIST);
            const tomorrowStartIST = new Date(`${tomorrowStr}T00:00:00.000+05:30`);

            const acceptedPaidBase = {
                photographer_id: myId,
                bookingStatus: "accepted",
                status: { $nin: ["completed", "canceled"] },
                paymentStatus: { $in: ["partially paid", "fully paid"] }
            };

            // 1. Today's Bookings (Paid only)
            const todaysCount = await ServiceBooking.countDocuments({
                ...acceptedPaidBase,
                $or: [
                    { bookingDate: { $gte: todayStartIST, $lt: tomorrowStartIST } },
                    { startDate: todayStr },
                    { eventDate: todayStr }
                ]
            });

            // 2. Upcoming: Strictly FUTURE (Tomorrow onwards, Paid only)
            const upcomingCount = await ServiceBooking.countDocuments({
                ...acceptedPaidBase,
                $or: [
                    { bookingDate: { $gte: tomorrowStartIST } },
                    { startDate: { $gte: tomorrowStr } },
                    { eventDate: { $gte: tomorrowStr } }
                ]
            });

            // 3. Completed/History: Status is completed OR date is in the past
            const completedCount = await ServiceBooking.countDocuments({
                photographer_id: myId,
                bookingStatus: "accepted",
                status: { $ne: "canceled" },
                $or: [
                    { status: "completed" },
                    { bookingDate: { $lt: todayStartIST } },
                    { $and: [{ startDate: { $lt: todayStr } }, { $or: [{ endDate: { $exists: false } }, { endDate: { $lt: todayStr } }] }] },
                    { eventDate: { $lt: todayStr } }
                ]
            });

            // 4. Pending Uploads
            const uploadPending = await ServiceBooking.countDocuments({
                photographer_id: myId,
                bookingStatus: "accepted",
                status: { $ne: "canceled" },
                galleryStatus: { $ne: "Photos Uploaded" }
            });

            const data = {
                todaysBookingCount: todaysCount,
                upcomingBookingCount: upcomingCount,
                upcommingBookingCount: upcomingCount,
                completedBookingCount: completedCount,
                uploadPending,
                totalBookingCount: todaysCount + upcomingCount + completedCount
            };

            return sendSuccessResponse(res, data, "Booking count fetched successfully");
        } catch (error) {
            console.error("Error in getBookingCount:", error);
            return sendErrorResponse(res, error, 500);
        }
    }
    async todaysBooking(req, res, next) {
        try {
            const myId = new mongoose.Types.ObjectId(req.user.id);
            const limit = req.query.limit;
            const skip = req.query.skip || 0;
            console.log(myId)

            const now = new Date();
            const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
            const todayStr = istNow.toISOString().split("T")[0];

            const todayStartIST = new Date(`${todayStr}T00:00:00.000+05:30`);
            const tomorrowStartIST = new Date(todayStartIST.getTime() + 86400000);

            const bookings = await ServiceBooking.find({
                photographer_id: myId,
                bookingStatus: "accepted",
                status: { $ne: "canceled" },
                $or: [
                    { bookingDate: { $gte: todayStartIST, $lt: tomorrowStartIST } },
                    { startDate: todayStr }
                ]
            })
                .sort({ startDate: 1, bookingDate: 1, createdAt: 1 }) // Primary sort: startDate ASC
                .populate("client_id", "username email mobileNumber avatar")
                .populate("service_id", "serviceName")
                .populate("quoteId", "requirements photographyRequirements")
                .skip(skip)
                .limit(limit);

            const formattedBookings = bookings.map(booking => {
                const ist = this.formatIST(booking.bookingDate, booking.startDate || booking.eventDate);

                // Construct Venue if address is missing
                const displayAddress = booking.address || booking.location || ""

                return {
                    _id: booking._id,
                    bookingId: booking.veroaBookingId,
                    clientName: booking.client_id?.username || "N/A",
                    clientAvatar: booking.client_id?.avatar || null,
                    mobileNumber: booking.client_id?.mobileNumber || "N/A",
                    eventType: booking.service_id?.serviceName || "N/A",
                    requirements: booking.notes || (booking.quoteId?.requirements?.length > 0 ? booking.quoteId.requirements.join(", ") : booking.quoteId?.photographyRequirements) || "No requirements",
                    date: ist.date,
                    time: ist.time,
                    fromDate: this.formatDMY(booking.startDate || booking.eventDate || booking.bookingDate),
                    toDate: this.formatDMY(booking.endDate || booking.startDate || booking.eventDate || booking.bookingDate),
                    city: booking.city,
                    lat: booking.lat || null,
                    lng: booking.lng || null,
                    address: displayAddress,
                    status: booking.status,
                    bookingStatus: booking.bookingStatus,
                    galleryStatus: booking.galleryStatus || "Upload Pending",
                    totalAmount: booking.totalAmount,
                    photographerAmount: booking.photographerAmount || 0,
                    budget: booking.photographerAmount || 0,
                    IsVerified: booking.otpVerified
                };
            });

            return sendSuccessResponse(res, formattedBookings, "Todays bookings fetched successfully");
        } catch (error) {
            return sendErrorResponse(res, error, 500);
        }
    }

    // Get summary counts: todays bookings (today+upcoming), upcoming bookings (future only), and completed
    async getSummaryCounts(req, res) {
        try {
            const myId = new mongoose.Types.ObjectId(req.user.id);
            const now = new Date();
            const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
            const todayStartIST = new Date(`${todayStr}T00:00:00.000+05:30`);
            
            const tomorrowIST = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
            tomorrowIST.setDate(tomorrowIST.getDate() + 1);
            const tomorrowStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(tomorrowIST);
            const tomorrowStartIST = new Date(`${tomorrowStr}T00:00:00.000+05:30`);

            // 1. Todays Bookings: Include completed ones today
            const todayCount = await ServiceBooking.countDocuments({
                photographer_id: myId,
                bookingStatus: "accepted",
                status: { $ne: "canceled" },
                $or: [
                    { bookingDate: { $gte: todayStartIST, $lt: tomorrowStartIST } },
                    { startDate: todayStr }
                ]
            });

            // 2. Upcoming: Strictly Tomorrow onwards, not completed
            const futureOnlyCount = await ServiceBooking.countDocuments({
                photographer_id: myId,
                bookingStatus: "accepted",
                status: { $nin: ["completed", "canceled"] },
                $or: [
                    { bookingDate: { $gte: tomorrowStartIST } },
                    { startDate: { $gte: tomorrowStr } }
                ]
            });

            // 3. Completed: History count (must be accepted, past or completed)
            const completedCount = await ServiceBooking.countDocuments({
                photographer_id: myId,
                bookingStatus: "accepted",
                status: { $ne: "canceled" },
                $or: [
                    { status: "completed" },
                    { bookingDate: { $lt: todayStartIST } },
                    { startDate: { $lt: todayStr } }
                ]
            });

            const data = {
                todaysBookings: todayCount,
                upcommingBooking: futureOnlyCount,
                completed: completedCount
            };

            return sendSuccessResponse(res, data, "Booking summary counts fetched successfully");
        } catch (error) {
            console.error("Error in getSummaryCounts:", error);
            return sendErrorResponse(res, error, 500);
        }
    }

    // Get consolidated dashboard counts for photographer
    async getDashboardCounts(req, res) {
        try {
            const myId = new mongoose.Types.ObjectId(req.user.id);
            const now = new Date();
            const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
            const todayStartIST = new Date(`${todayStr}T00:00:00.000+05:30`);

            const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
            const tomorrowIST = new Date(istTime);
            tomorrowIST.setDate(tomorrowIST.getDate() + 1);
            const tomorrowStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(tomorrowIST);
            const tomorrowStartIST = new Date(`${tomorrowStr}T00:00:00.000+05:30`);

            // 1. Today's Bookings
            const todayCount = await ServiceBooking.countDocuments({
                photographer_id: myId,
                bookingStatus: "accepted",
                status: { $ne: "canceled" },
                $or: [
                    { bookingDate: { $gte: todayStartIST, $lt: tomorrowStartIST } },
                    { startDate: todayStr }
                ]
            });

            // 2. Upcoming Bookings (Tomorrow onwards)
            const upcomingCount = await ServiceBooking.countDocuments({
                photographer_id: myId,
                bookingStatus: "accepted",
                status: { $nin: ["completed", "canceled"] },
                $or: [
                    { bookingDate: { $gte: tomorrowStartIST } },
                    { startDate: { $gte: tomorrowStr } }
                ]
            });

            // 3. Booking Requests (Pending Invitations/Assignments)
            const requestsCount = await ServiceBooking.countDocuments({
                $or: [
                    { photographerIds: { $in: [myId] } },
                    { photographer_id: myId, bookingStatus: "pending" }
                ],
                status: { $ne: "canceled" }
            });

            // 4. Pending Gallery Uploads
            const uploadPendingCount = await ServiceBooking.countDocuments({
                photographer_id: myId,
                bookingStatus: "accepted",
                status: { $ne: "canceled" },
                galleryStatus: "Upload Pending"
            });

            const data = {
                today: todayCount,
                upcoming: upcomingCount,
                requests: requestsCount,
                uploadPending: uploadPendingCount
            };

            return sendSuccessResponse(res, data, "Dashboard counts fetched successfully");
        } catch (error) {
            console.error("Error in getDashboardCounts:", error);
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
            const now = new Date();
            const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
            const todayStr = istTime.toISOString().split("T")[0];
            const todayStartIST = new Date(`${todayStr}T00:00:00.000+05:30`);
            const tomorrowStartIST = new Date(todayStartIST.getTime() + 86400000);

            const acceptedFilter = {
                photographer_id: myId,
                bookingStatus: "accepted",
                status: { $nin: ["completed", "canceled"] }
            };

            const query = {
                ...acceptedFilter,
                $or: [
                    { bookingDate: { $gte: todayStartIST, $lt: tomorrowStartIST } },
                    { startDate: todayStr }
                ]
            };

            // Date Filter
            const { startDate, endDate } = req.query;
            if (startDate) {
                const sDate = new Date(startDate);
                if (isNaN(sDate.getTime())) {
                    return res.status(200).json({ success: false, message: "Invalid startDate format." });
                }
                sDate.setUTCHours(0, 0, 0, 0);

                const eDate = endDate ? new Date(endDate) : new Date(startDate);
                if (isNaN(eDate.getTime())) {
                    return res.status(200).json({ success: false, message: "Invalid endDate format." });
                }
                eDate.setUTCHours(23, 59, 59, 999);

                const fs = sDate.toISOString().split("T")[0];
                const ts = eDate.toISOString().split("T")[0];

                query.$and = query.$and || [];
                query.$and.push({
                    $or: [
                        { bookingDate: { $gte: sDate, $lte: eDate } },
                        { startDate: { $gte: fs, $lte: ts } }
                    ]
                });
            }

            // Search Filter
            const { search } = req.query;
            if (search) {
                const searchRegex = new RegExp(search, "i");
                const matchingClients = await User.find({ username: searchRegex }).select("_id");
                const clientIds = matchingClients.map(c => c._id);

                const searchOr = [
                    { veroaBookingId: searchRegex }
                ];
                if (clientIds.length > 0) {
                    searchOr.push({ client_id: { $in: clientIds } });
                }

                query.$and = query.$and || [];
                query.$and.push({ $or: searchOr });
            }

            const [bookings, total] = await Promise.all([
                ServiceBooking.find(query)
                    .sort({ startDate: 1, bookingDate: 1, createdAt: 1 }) // Sort earliest first
                    .populate("client_id", "username email mobileNumber avatar city")
                    .populate("service_id", "serviceName")
                    .populate("quoteId", "requirements photographyRequirements")
                    .skip(skip)
                    .limit(limit),
                ServiceBooking.countDocuments(query)
            ]);

            const formattedBookings = bookings.map(booking => {
                const ist = this.formatIST(booking.bookingDate, booking.startDate || booking.eventDate);

                // Construct Venue if address is missing
                const displayAddress = booking.address || booking.location || ""

                const bStartDate = booking.startDate || (booking.bookingDate ? booking.bookingDate.toISOString().split("T")[0] : null);
                const isToday = bStartDate === todayStr;

                const result = {
                    _id: booking._id,
                    bookingId: booking.veroaBookingId,
                    clientName: booking.client_id?.username || "N/A",
                    clientAvatar: booking.client_id?.avatar || null,
                    requirements: booking.notes || (booking.quoteId?.requirements?.length > 0 ? booking.quoteId.requirements.join(", ") : booking.quoteId?.photographyRequirements) || "No requirements",
                    eventType: booking.service_id?.serviceName || "N/A",
                    date: ist.date,
                    time: ist.time,
                    fromDate: this.formatDMY(booking.startDate || booking.eventDate || booking.bookingDate),
                    toDate: this.formatDMY(booking.endDate || booking.startDate || booking.eventDate || booking.bookingDate),
                    city: booking.city,
                    lat: booking.lat || null,
                    lng: booking.lng || null,
                    address: displayAddress,
                    photographerAmount: booking.photographerAmount || 0,
                    budget: booking.photographerAmount || 0,
                    otpVerified: booking.otpVerified
                };

                // Only include client number for today's bookings
                if (isToday) {
                    result.clientnumber = booking.client_id?.mobileNumber || "N/A";
                }

                return result;
            });

            return sendSuccessResponse(res, {
                bookings: formattedBookings,
                meta: { total, page, limit }
            }, "Today and upcoming bookings fetched successfully");
        } catch (error) {
            return sendErrorResponse(res, error, 500);
        }
    }

    // Get bookings specifically for gallery upload (filtered out "Photos Uploaded")
    async getBookingsForGalleryUpload(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.max(1, parseInt(req.query.limit) || 10);
            const skip = (page - 1) * limit;

            const myId = new mongoose.Types.ObjectId(req.user.id);

            // Filter for this photographer, only accepted bookings,
            // excluding canceled ones, and excluding those already uploaded.
            const filter = {
                photographer_id: myId,
                bookingStatus: "accepted",
                status: { $ne: "canceled" },
                galleryStatus: { $ne: "Photos Uploaded" }
            };

            // Search Filter (Client Name or Veroa ID)
            const { search } = req.query;
            if (search) {
                const searchRegex = new RegExp(search, "i");
                const matchingClients = await User.find({ username: searchRegex }).select("_id");
                const clientIds = matchingClients.map(c => c._id);

                const searchOr = [
                    { veroaBookingId: searchRegex }
                ];
                if (clientIds.length > 0) {
                    searchOr.push({ client_id: { $in: clientIds } });
                }

                filter.$and = [];
                filter.$and.push({ $or: searchOr });
            }

            const [bookings, total] = await Promise.all([
                ServiceBooking.find(filter)
                    .sort({ createdAt: -1 })
                    .populate("client_id", "username email mobileNumber avatar city")
                    .populate("service_id", "serviceName")
                    .skip(skip)
                    .limit(limit),
                ServiceBooking.countDocuments(filter)
            ]);

            const formattedBookings = bookings.map(booking => {
                const ist = this.formatIST(booking.bookingDate, booking.startDate || booking.eventDate);

                // Construct Venue if address is missing
                const displayAddress = booking.address || booking.location || ""

                return {
                    _id: booking._id,
                    bookingId: booking.veroaBookingId,
                    clientName: booking.client_id?.username || "N/A",
                    clientAvatar: booking.client_id?.avatar || null,
                    eventType: booking.service_id?.serviceName || "N/A",
                    date: ist.date,
                    time: ist.time,
                    fromDate: this.formatDMY(booking.startDate || booking.eventDate || booking.bookingDate),
                    toDate: this.formatDMY(booking.endDate || booking.startDate || booking.eventDate || booking.bookingDate),
                    city: booking.city,
                    lat: booking.lat || null,
                    lng: booking.lng || null,
                    address: displayAddress,
                    photographerAmount: booking.photographerAmount || 0,
                    budget: booking.photographerAmount || 0,
                    galleryStatus: booking.galleryStatus || "Upload Pending"
                };
            });

            return sendSuccessResponse(res, {
                bookings: formattedBookings,
                meta: { total, page, limit }
            }, "Bookings for gallery upload fetched successfully");
        } catch (error) {
            return sendErrorResponse(res, error, 500);
        }
    }

    // Get bookings specifically for gallery upload (filtered out "Photos Uploaded")
    async getUploadPendingBookings(req, res) {
        return this.getBookingsForGalleryUpload(req, res);
    }


    // Resend Booking OTP for photographer
    async resendBookingOtp(req, res) {
        try {
            const { id } = req.params;
            const { mobile: mobileOverride } = req.body;
            const myId = req.user._id;

            const booking = await ServiceBooking.findById(id).populate("photographer_id");
            if (!booking) {
                return sendErrorResponse(res, { message: "Booking not found" }, 404);
            }

            if (booking.otpVerified) {
                return sendErrorResponse(res, { message: "This booking is already OTP verified." }, 400);
            }

            // Verify the photographer requesting the OTP is the one assigned
            const requesterId = req.user?.id || req.user?._id;
            const assignedId = booking.photographer_id?._id || booking.photographer_id;

            if (String(requesterId) !== String(assignedId)) {
                return sendErrorResponse(res, { message: "Unauthorized: You are not the assigned photographer for this booking" }, 403);
            }

            // ✅ RESEND LOGIC: Self-healing flow (Try retry, if it fails, try fresh)
            const client = await User.findById(booking.client_id);
            const targetMobile = (mobileOverride || client?.mobileNumber)?.toString().replace(/\D/g, "");

            if (!targetMobile) {
                return sendErrorResponse(res, { message: "Client phone number not found. Please provide it in the body." }, 400);
            }

            if (booking.bookingOtp && booking.bookingOtp.length > 5) {
                try {
                    console.log(`[SMS] Attempting re-delivery for ID: ${booking.bookingOtp}`);
                    await retryMessageCentral(booking.bookingOtp);
                    return sendSuccessResponse(res, { bookingId: id, client_mobile: targetMobile }, "OTP re-delivered to client successfully");
                } catch (retryErr) {
                    console.warn("[LOG] Re-delivery endpoint failed, pivoting to fresh request...");
                    // No return here, fall through to Attempt 2
                }
            }

            // Attempt 2: Fresh OTP request (Starts a new session or links to existing)
            try {
                const response = await sendMessageCentral(targetMobile, 4);
                const vId = response.data?.verificationId || response.data?.data?.verificationId || response.data?.id || null;

                if (vId) {
                    booking.bookingOtp = vId;
                    await booking.save();
                    return sendSuccessResponse(res, { bookingId: id, client_mobile: targetMobile }, "Fresh OTP sent to client successfully");
                } else {
                    return sendErrorResponse(res, { message: "OTP service reached but no ID returned" }, 502);
                }
            } catch (smsErr) {
                const errorData = smsErr.response?.data;
                const vIdFromError = errorData?.verificationId || errorData?.data?.verificationId || errorData?.id || null;

                // If the provider says it already exists (506), capture the NEW id if it changed
                if (vIdFromError) {
                    booking.bookingOtp = vIdFromError;
                    await booking.save();
                    return sendSuccessResponse(res, { bookingId: id, client_mobile: targetMobile }, "Existing session confirmed, client should check their mobile.");
                }

                console.error("[CRITICAL] Resend failed for Client (v3):", errorData || smsErr.message);
                return sendErrorResponse(res, { message: "The SMS service is busy, please wait 30 seconds." }, 503);
            }
        } catch (error) {
            console.error("Error resending booking OTP:", error);
            return sendErrorResponse(res, error, 500);
        }
    }

    /**
     * Verify the 4-digit OTP provided by the client
     * POST /api/photographers/bookings/:id/verify-otp
     */
    async verifyBookingOtp(req, res) {
        try {
            const { id } = req.params;
            const { otp } = req.body;
            const myId = req.user._id;

            if (!otp) {
                return sendErrorResponse(res, { message: "OTP is required" }, 400);
            }

            const booking = await ServiceBooking.findById(id).populate("photographer_id");

            if (!booking) {
                return sendErrorResponse(res, { message: "Booking not found" }, 404);
            }

            if (booking.otpVerified) {
                return sendErrorResponse(res, { message: "This booking is already OTP verified." }, 400);
            }

            // Verify the photographer doing the verification is the one assigned
            const requesterId = req.user?.id || req.user?._id;
            const assignedId = booking.photographer_id?._id || booking.photographer_id;

            if (String(requesterId) !== String(assignedId)) {
                return sendErrorResponse(res, { message: "Unauthorized: You are not assigned to this booking" }, 403);
            }

            if (!booking.bookingOtp) {
                return sendErrorResponse(res, { message: "No active OTP found for this booking" }, 400);
            }

            // Call Message Central to verify the 4-digit code against the stored token
            try {
                const response = await verifyMessageCentral(booking.bookingOtp, otp);
                const responseData = response?.data || {};
                const providerCode = Number(responseData.responseCode || responseData.data?.responseCode || 0);

                if (response.status !== 200 || providerCode !== 200) {
                    let errorMessage = "Invalid or expired OTP";
                    if (providerCode === 702) errorMessage = "Incorrect OTP entered. Please try again.";
                    if (providerCode === 705) errorMessage = "OTP session expired. Please resend.";
                    if (providerCode === 700) errorMessage = "Verification failed. Please try again.";

                    return sendErrorResponse(res, {
                        message: errorMessage,
                        provider: responseData.message || responseData.errorMessage,
                        providerCode
                    }, 400);
                }

                // If we are here, it means the provider returned 200/Success
                // Mark the booking as verified/confirmed
                booking.bookingOtp = null; // Clear OTP after success
                booking.otpVerified = true;
                booking.status = "confirmed";

                await booking.save();

                return sendSuccessResponse(res, { bookingId: id }, "OTP verified successfully. Job confirmed.");
            } catch (err) {
                const errorData = err.response?.data || {};
                const providerCode = Number(errorData.responseCode || errorData.data?.responseCode || err.response?.status || 0);
                console.error("OTP Verification failed for booking:", id, errorData);

                let errorMessage = "Invalid or expired OTP";
                if (providerCode === 702) errorMessage = "Incorrect OTP entered. Please try again.";
                if (providerCode === 705) errorMessage = "OTP session expired. Please resend.";
                if (providerCode === 700) errorMessage = "Verification failed. Please try again.";

                return sendErrorResponse(res, {
                    message: errorMessage,
                    provider: errorData.message || errorData.errorMessage,
                    providerCode
                }, 400);
            }
        } catch (error) {
            console.error("Error verifying booking OTP:", error);
            return sendErrorResponse(res, error, 500);
        }
    }
}

export default new BookingController();