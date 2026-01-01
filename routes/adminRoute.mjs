import express from "express";
import AdminController from "../controllers/AdminController.mjs";
import PackageController from "../controllers/PackageController.mjs";
import ServiceController from "../controllers/ServiceController.mjs";
import PaymentController from "../controllers/PaymentController.mjs";
import PayoutController from "../controllers/PayoutController.mjs";
import upload from "../Config/multer.mjs";
import authMiddleware from "../middleware/authmiddleware.mjs";

const router = express.Router();

// Apply Auth and Admin check to all 


// --- Admin Management ---
router.post("/", authMiddleware, upload.single("avatar"), (req, res, next) => AdminController.create(req, res, next));
router.get("/", authMiddleware, (req, res, next) => AdminController.list(req, res, next));
router.get("/:id", authMiddleware, (req, res, next) => AdminController.getById(req, res, next));
router.put("/:id", authMiddleware, (req, res, next) => AdminController.update(req, res, next));
router.delete("/:id", authMiddleware, (req, res, next) => AdminController.delete(req, res, next));

// --- Package Management ---
router.post("/packages", authMiddleware, (req, res, next) => PackageController.create(req, res, next));
router.get("/packages", authMiddleware, (req, res, next) => PackageController.getAll(req, res, next));
router.get("/packages/:id", authMiddleware, (req, res, next) => PackageController.getOne(req, res, next));
router.put("/packages/:id", authMiddleware, (req, res, next) => PackageController.update(req, res, next));
router.delete("/packages/:id", authMiddleware, (req, res, next) => PackageController.delete(req, res, next));

// --- Service Management ---
router.post("/services", authMiddleware, (req, res, next) => ServiceController.create(req, res, next));
router.get("/services", authMiddleware, (req, res, next) => ServiceController.list(req, res, next)); // Assuming ServiceController has list/create
router.get("/services/:id", authMiddleware, (req, res, next) => ServiceController.getById(req, res, next));
router.put("/services/:id", authMiddleware, (req, res, next) => ServiceController.update(req, res, next));
router.delete("/services/:id", authMiddleware, (req, res, next) => ServiceController.delete(req, res, next));

// --- Financials ---
router.get("/payments", authMiddleware, (req, res, next) => PaymentController.list(req, res, next));
router.get("/payouts", authMiddleware, (req, res, next) => PayoutController.list(req, res, next));

// --- Enquiries ---
router.post("/enquiries", authMiddleware, (req, res, next) => EnquiryController.create(req, res, next));
router.get("/enquiries", authMiddleware, (req, res, next) => EnquiryController.list(req, res, next));

// --- Bookings Management ---
router.post("/bookings", authMiddleware, (req, res, next) => ServiceBookingController.create(req, res, next));
router.get("/bookings", authMiddleware, (req, res, next) => ServiceBookingController.list(req, res, next));
router.get("/bookings/:id", authMiddleware, (req, res, next) => ServiceBookingController.getById(req, res, next));

// --- Quotes Management---
router.post("/quotes", authMiddleware, (req, res, next) => PersonalizedQuoteController.create(req, res, next));
router.get("/quotes", authMiddleware, (req, res, next) => PersonalizedQuoteController.list(req, res, next));

// --- Reviews Management ---
router.post("/reviews", authMiddleware, (req, res, next) => ReviewController.create(req, res, next));
router.put("/reviews/:id", authMiddleware, (req, res, next) => ReviewController.update(req, res, next));
router.delete("/reviews/:id", authMiddleware, (req, res, next) => ReviewController.delete(req, res, next));

// --- Services ---
router.get("/services", authMiddleware, (req, res, next) => ServiceController.list(req, res, next));
router.get("/services/:id", authMiddleware, (req, res, next) => ServiceController.getById(req, res, next));

// --- Packages ---
router.get("/packages", authMiddleware, (req, res, next) => PackageController.list(req, res, next));
router.get("/packages/:id", authMiddleware, (req, res, next) => PackageController.getById(req, res, next));

// ServiceBooking
router.post("/servicebookings", authMiddleware, (req, res, next) => ServiceBookingController.create(req, res, next));
router.get("/servicebookings", authMiddleware, (req, res, next) => ServiceBookingController.list(req, res, next));
router.get("/servicebookings/:id", authMiddleware, (req, res, next) => ServiceBookingController.getById(req, res, next));

export default router;
