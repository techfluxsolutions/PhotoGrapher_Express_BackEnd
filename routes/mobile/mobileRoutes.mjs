import express from "express";
import MobileBookingController from "../../controllers/mobile/MobileBookingController.mjs";
import MobileRevenueController from "../../controllers/mobile/MobileRevenueController.mjs";
import authMiddleware from "../../middleware/authmiddleware.mjs";
import { isPhotographer } from "../../middleware/isValid.Middleware.mjs";

const router = express.Router();

// Protect all mobile routes by default
router.use(authMiddleware);

// --- Mobile Client Bookings ---
router.post("/bookings", (req, res, next) => MobileBookingController.create(req, res, next));
router.get("/bookings", (req, res, next) => MobileBookingController.list(req, res, next));
router.get("/bookings/:id", (req, res, next) => MobileBookingController.getById(req, res, next));
router.put("/bookings/:id", (req, res, next) => MobileBookingController.update(req, res, next));
router.delete("/bookings/:id", (req, res, next) => MobileBookingController.delete(req, res, next));
router.put("/bookings/:id/cancel", (req, res, next) => MobileBookingController.cancelBooking(req, res, next));

// --- Mobile Photographer Revenue Dashboard ---
// Apply the isPhotographer check specifically for revenue
router.get(
  "/photographer/revenue",
  isPhotographer,
  (req, res, next) =>
    MobileRevenueController.getRevenueDashboard(req, res, next)
);

// --- Photographer Bookings ---
router.get("/photographer/bookings/upcoming", isPhotographer, (req, res, next) => MobileBookingController.getPhotographerUpcomingBookings(req, res, next));

export default router;
