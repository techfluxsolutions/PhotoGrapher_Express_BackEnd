import express from "express";
import upload from "../../Config/multer.mjs";
import { chunkUpload } from "../../Config/chunkMulter.mjs";
import PhotographerController from "../../controllers/photographer/PhotographerController.mjs";
import PhotographerAuthController from "../../controllers/photographer/PhotographerAuthController.mjs";
import AvailabilityController from "../../controllers/User/AvailabilityController.mjs";
import JobController from "../../controllers/User/JobController.mjs";
import PayoutController from "../../controllers/photographer/PayoutController.mjs";
import BookingController from "../../controllers/photographer/BookingController.mjs";
import galleryUpload from "../../Config/galleryMulter.mjs";
import authMiddleware from "../../middleware/authmiddleware.mjs";
import { isPhotographer } from "../../middleware/isValid.Middleware.mjs";
import ServiceController from "../../controllers/User/ServiceController.mjs";
import NotificationController from "../../controllers/photographer/NotificationController.mjs";
import { uploadController } from "../../controllers/uploadController.js";
import DataLinksController from "../../controllers/DataLinksController.js";
import ReviewAndRatingController from "../../controllers/User/ReviewAndRating.mjs";
import RazorpayController from "../../controllers/photographer/RazorpayController.mjs";
const router = express.Router();

// --- Auth Routes ---
router.post("/auth/login", (req, res, next) => PhotographerAuthController.login(req, res, next));
router.post("/auth/forgot-password", (req, res, next) => PhotographerAuthController.forgotPassword(req, res, next));
router.post("/auth/reset-password", (req, res, next) => PhotographerAuthController.resetPassword(req, res, next));




// --- Status Check (Can be used by anyone if ID provided, or Self if authenticated) ---
router.get("/status/:id", (req, res, next) => PhotographerController.getPhotographerStatus(req, res, next));
router.put("/status/:id", (req, res, next) => PhotographerController.updatePhotographerStatus(req, res, next));
router.post("/status/:id", (req, res, next) => PhotographerController.updatePhotographerStatus(req, res, next));

// Apply Auth and Photographer check for subsequent routes
router.use(authMiddleware, isPhotographer);

// --- Profile & Self ---
// Note: Photographer management (CRUD) is mostly Admin, but Photographers can update themselves
router.get("/me", (req, res, next) => PhotographerController.getPhotographerById(req, res, next));
router.get("/status", (req, res, next) => PhotographerController.getPhotographerStatus(req, res, next));
router.put("/status", (req, res, next) => PhotographerController.updatePhotographerStatus(req, res, next));
router.post("/status", (req, res, next) => PhotographerController.updatePhotographerStatus(req, res, next));
router.patch("/me", upload.single('profilePhoto'), (req, res, next) => PhotographerController.updatePhotographer(req, res, next));





// --- Data Links ---
router.get("/datalinks", (req, res, next) => DataLinksController.getAll(req, res, next));
router.get("/datalinks/:id", (req, res, next) => DataLinksController.getById(req, res, next));


// --- Availability ---
router.post("/availability", (req, res, next) => AvailabilityController.create(req, res, next));
router.get("/availability", (req, res, next) => AvailabilityController.getAll(req, res, next));
router.delete("/availability/:id", (req, res, next) => AvailabilityController.delete(req, res, next));

// --- Jobs (Assigned to them) ---
router.get("/jobs", (req, res, next) => JobController.getAll(req, res, next)); // Controller might need filtering logic for 'my jobs'
router.get("/jobs/:id", (req, res, next) => JobController.getOne(req, res, next));
// Update job status (e.g. mark complete)
router.patch("/jobs/:id", (req, res, next) => JobController.update(req, res, next));

// --- Payouts ---
router.post("/razorpay-account", (req, res, next) => RazorpayController.createRazorpayAccount(req, res, next));
router.get("/payouts", (req, res, next) => PayoutController.getAll(req, res, next));
router.get("/payouts/:id", (req, res, next) => PayoutController.getOne(req, res, next));
router.post("/payouts", (req, res, next) => PayoutController.create(req, res, next));
router.put("/payouts/:id", (req, res, next) => PayoutController.update(req, res, next));
router.put("/payouts/booking/:bookingId", (req, res, next) => PayoutController.updateByBookingId(req, res, next)); // New Route
router.delete("/payouts/:id", (req, res, next) => PayoutController.delete(req, res, next));

// --- Bookings ---
router.get("/bookings", (req, res, next) => BookingController.getAllBookings(req, res, next));
router.get("/bookings/pending", (req, res, next) => BookingController.getPendingBookings(req, res, next));
router.get("/bookings/accepted", (req, res, next) => BookingController.getAcceptedBookings(req, res, next));
router.get("/bookings/rejected", (req, res, next) => BookingController.getRejectedBookings(req, res, next));
router.get("/bookings/completed", (req, res, next) => BookingController.getCompletedBookings(req, res, next));
router.patch("/bookings/:id/status", (req, res, next) => BookingController.updateBookingStatus(req, res, next));
router.post("/bookings/initialize-status", (req, res, next) => BookingController.initializePreviousBookingsStatus(req, res, next));

// get booking counts 
router.get("/bookings/summary-counts", (req, res, next) => BookingController.getSummaryCounts(req, res, next));
router.get("/bookings/today-upcoming", (req, res, next) => BookingController.getTodayAndUpcomingBookings(req, res, next));
router.post("/bookings/:id/resend-otp", (req, res, next) => BookingController.resendBookingOtp(req, res, next));
router.post("/bookings/:id/verify-otp", (req, res, next) => BookingController.verifyBookingOtp(req, res, next));



router.get("/bookings/:id", (req, res, next) => BookingController.getBookingById(req, res, next));
router.post("/bookings", (req, res, next) => BookingController.createBooking(req, res, next));
router.put("/bookings/:id", (req, res, next) => BookingController.updateBooking(req, res, next));
router.delete("/bookings/:id", (req, res, next) => BookingController.deleteBooking(req, res, next));

// --- Gallery ---
// 'gallery' is the field name, max 50 files
router.post("/bookings/:id/gallery", galleryUpload.array('gallery', 50), (req, res, next) => BookingController.uploadGallery(req, res, next));
router.post("/bookings/:id/gallery/server", galleryUpload.array('gallery', 50), (req, res, next) => BookingController.uploadGalleryToServer(req, res, next));
router.post("/bookings/:id/gallery/cloud", galleryUpload.array('gallery', 50), (req, res, next) => BookingController.uploadGalleryToCloud(req, res, next));
router.post("/bookings/:id/gallery/share", (req, res, next) => BookingController.shareGallery(req, res, next));


// --- Invoice (For their bookings) ---
router.get("/invoices/:bookingId", (req, res, next) => BookingController.downloadInvoice(req, res, next));

// --- Notifications ---
router.get("/notifications", (req, res, next) => NotificationController.getNotifications(req, res, next));
router.patch("/notifications/:id/read", (req, res, next) => NotificationController.markAsRead(req, res, next));

// --- Services ---
router.get("/servicename", (req, res, next) => ServiceController.getServiceNameOnly(req, res, next));
router.get("/services/:id", (req, res, next) => ServiceController.getById(req, res, next));

// --- Uploads ---
router.post("/uploads/start", (req, res, next) => UploadController.startUpload(req, res, next));
router.post("/uploads/part", (req, res, next) => UploadController.getUploadPartUrl(req, res, next));
router.post("/uploads/complete", (req, res, next) => UploadController.completeUpload(req, res, next));


// s3 

router.post("/start", uploadController.startUpload);
router.post("/get-part-url", uploadController.getPartUploadUrl);
router.post("/chunk", chunkUpload.single("chunk"), uploadController.uploadChunk);
router.post("/complete", uploadController.completeUpload);
router.post("/abort", uploadController.abortUpload);

//RatingsAnd Review

//getPhotographer average ratings by users and the admin 

router.get("/ratings", (req, res, next) => ReviewAndRatingController.getAverageOfPhotographerRating(req, res, next));

// Support streaming and batch downloading
router.get("/stream/:bookingId/*key", (req, res, next) => uploadController.streamProtectedFile(req, res, next));
router.post("/downloadZip", (req, res, next) => uploadController.downloadZip(req, res, next));
router.post("/downloadZiponFourtyPlus", (req, res, next) => uploadController.downloadZiponFourtyPlus(req, res, next));
router.post("/downloadSingleFile", (req, res, next) => uploadController.downloadSingleFile(req, res, next));
router.post("/downloadMultipleFiles", (req, res, next) => uploadController.downloadMultipleFiles(req, res, next));
router.post("/deleteSingleFile", (req, res, next) => uploadController.deleteSingleS3File(req, res, next));
router.post("/deleteMultipleFiles", (req, res, next) => uploadController.deleteMultipleS3Files(req, res, next));
router.delete("/deleteAllFiles/:bookingId", (req, res, next) => uploadController.deleteAllS3Files(req, res, next));
router.get("/getArrayImages/:bookingId", (req, res, next) => uploadController.getUrlsListArray(req, res, next));



// Extraa routes for mobile 

// dashboard get count of upcomming , pending bookings
router.get('/getcount', (req, res, next) => BookingController.getBookingCount(req, res, next));

// get todays schedule bookings

router.get('/gettodaysbookings', (req, res, next) => BookingController.todaysBooking(req, res, next));
export default router;
