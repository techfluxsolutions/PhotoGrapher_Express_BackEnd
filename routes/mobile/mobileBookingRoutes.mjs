import express from "express";
import MobileBookingController from "../../controllers/mobile/MobileBookingController.mjs";
import authMiddleware from "../../middleware/authmiddleware.mjs";

const router = express.Router();

// Protected Routes
router.use(authMiddleware);

// --- Bookings ---
// this is for the mobile only
router.post("/bookings", (req, res, next) => MobileBookingController.create(req, res, next));
router.get("/bookings", (req, res, next) => MobileBookingController.list(req, res, next));
router.get("/bookings/:id", (req, res, next) => MobileBookingController.getById(req, res, next));
router.put("/bookings/:id", (req, res, next) => MobileBookingController.update(req, res, next));
router.delete("/bookings/:id", (req, res, next) => MobileBookingController.delete(req, res, next));
router.put("/bookings/:id/cancel", (req, res, next) => MobileBookingController.cancelBooking(req, res, next));

export default router;
