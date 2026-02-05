import express from "express";
import PhotographerController from "../../controllers/photographer/PhotographerController.mjs";
import PhotographerAuthController from "../../controllers/photographer/PhotographerAuthController.mjs";
import AvailabilityController from "../../controllers/User/AvailabilityController.mjs";
import JobController from "../../controllers/User/JobController.mjs";
import PayoutController from "../../controllers/photographer/PayoutController.mjs";
import BookingController from "../../controllers/photographer/BookingController.mjs";
import galleryUpload from "../../Config/galleryMulter.mjs";
import authMiddleware from "../../middleware/authmiddleware.mjs";
import { isPhotographer } from "../../middleware/isValid.Middleware.mjs";

const router = express.Router();

// --- Auth Routes ---
router.post("/auth/login", (req, res, next) => PhotographerAuthController.login(req, res, next));
router.post("/auth/forgot-password", (req, res, next) => PhotographerAuthController.forgotPassword(req, res, next));
router.post("/auth/reset-password", (req, res, next) => PhotographerAuthController.resetPassword(req, res, next));

// Apply Auth and Photographer check
router.use(authMiddleware, isPhotographer);

// --- Profile & Self ---
// Note: Photographer management (CRUD) is mostly Admin, but Photographers can update themselves
router.get("/me", (req, res, next) => PhotographerController.getPhotographerById(req, res, next));
router.put("/me", (req, res, next) => PhotographerController.updatePhotographer(req, res, next));

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
router.get("/payouts", (req, res, next) => PayoutController.getAll(req, res, next));
router.get("/payouts/:id", (req, res, next) => PayoutController.getOne(req, res, next));
router.post("/payouts", (req, res, next) => PayoutController.create(req, res, next));
router.put("/payouts/:id", (req, res, next) => PayoutController.update(req, res, next));
router.delete("/payouts/:id", (req, res, next) => PayoutController.delete(req, res, next));

// -- New Routes --
// --- Bookings ---
router.get("/bookings", (req, res, next) => BookingController.getAllBookings(req, res, next));
router.get("/bookings/:id", (req, res, next) => BookingController.getBookingById(req, res, next));
router.post("/bookings", (req, res, next) => BookingController.createBooking(req, res, next));
router.put("/bookings/:id", (req, res, next) => BookingController.updateBooking(req, res, next));
router.delete("/bookings/:id", (req, res, next) => BookingController.deleteBooking(req, res, next));

// --- Gallery ---
// 'gallery' is the field name, max 50 files
router.post("/bookings/:id/gallery", galleryUpload.array('gallery', 50), (req, res, next) => BookingController.uploadGallery(req, res, next));
router.post("/bookings/:id/gallery/share", (req, res, next) => BookingController.shareGallery(req, res, next));


export default router;
