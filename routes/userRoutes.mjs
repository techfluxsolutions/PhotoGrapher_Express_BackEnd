import express from "express";
import UserController from "../controllers/UserController.mjs";
import EnquiryController from "../controllers/EnquiryController.mjs";
import ReviewController from "../controllers/ReviewController.mjs";
import ServiceBookingController from "../controllers/ServiceBookingController.mjs";
import PersonalizedQuoteController from "../controllers/PersonalizedQuoteController.mjs";
import ServiceController from "../controllers/ServiceController.mjs";
import FAQController from "../controllers/FAQController.mjs";
import authMiddleware from "../middleware/authmiddleware.mjs";
import QuoteController from "../controllers/QuoteController.mjs";
import PackageController from "../controllers/PackageController.mjs";
import createUploader from "../Config/uploadCreate.js";
import AdditionalServicesController from "../controllers/AdditionalServicesController.mjs";
const router = express.Router();

// router.use(authMiddleware); // Removed global auth middleware to allow public routes


// multer image upload this function sets the path of the image and its directory 

const uploadAvatar = createUploader({
    folder: "uploads/userProfile",
    maxSizeMB: 2,
    allowedTypes: /jpeg|jpg|png/,
});


// Public Routes (Optional, can be separate)
router.get("/services", (req, res, next) => ServiceController.getAll(req, res, next));
router.get("/faqs", (req, res, next) => FAQController.getAll(req, res, next));
router.get("/reviews", (req, res, next) => ReviewController.getAll(req, res, next));

// Protected Routes
// router.use(authMiddleware);

// --- User Profile ---
router.get("/me", (req, res, next) => UserController.getById(req, res, next));
router.put("/me", uploadAvatar.single("avatar"), (req, res, next) => UserController.update(req, res, next));

// --- Enquiries ---
router.post("/enquiries", (req, res, next) => EnquiryController.create(req, res, next));
router.get("/enquiries", (req, res, next) => EnquiryController.list(req, res, next));

// --- Bookings ---
router.post("/bookings", (req, res, next) => ServiceBookingController.create(req, res, next));
router.get("/bookings", (req, res, next) => ServiceBookingController.list(req, res, next));
router.get("/bookings/:id", (req, res, next) => ServiceBookingController.getById(req, res, next));

// --- Quotes ---
router.post("/quotes", (req, res, next) => QuoteController.create(req, res, next));
router.get("/quotes", (req, res, next) => QuoteController.getAll(req, res, next));
router.get("/quotes/:id", (req, res, next) => QuoteController.getById(req, res, next));
router.put("/quotes/:id", (req, res, next) => QuoteController.update(req, res, next));
router.delete("/quotes/:id", (req, res, next) => QuoteController.delete(req, res, next));
router.get("/quotes/status/:status", (req, res) => QuoteController.getByStatus(req, res));
router.put("/quotes/changeStatus/:id", (req, res, next) => QuoteController.changeStatus(req, res, next));


// Personalized Quotes
router.post("/personalized-quotes", (req, res, next) => PersonalizedQuoteController.create(req, res, next));
router.get("/personalized-quotes", (req, res, next) => PersonalizedQuoteController.getAll(req, res, next));
router.get("/personalized-quotes/:id", (req, res, next) => PersonalizedQuoteController.getById(req, res, next));
router.put("/personalized-quotes/:id", (req, res, next) => PersonalizedQuoteController.update(req, res, next));
router.delete("/personalized-quotes/:id", (req, res, next) => PersonalizedQuoteController.delete(req, res, next));

// --- Reviews ---
router.post("/reviews", (req, res, next) => ReviewController.create(req, res, next));
router.get("/reviews/:id", (req, res, next) => ReviewController.getById(req, res, next));


// --- Services ---
router.get("/services", (req, res, next) => ServiceController.list(req, res, next));
router.get("/services/:id", (req, res, next) => ServiceController.getById(req, res, next));
router.get("/servicename", (req, res, next) => ServiceController.getServiceNameOnly(req, res, next))

// additional services

router.post("/createadditionalServices", (req, res, next) => AdditionalServicesController.create(req, res, next));
router.put("/updateadditionalServices/:id", (req, res, next) => AdditionalServicesController.update(req, res, next));
router.delete("/deleteadditionalServices/:id", (req, res, next) => AdditionalServicesController.delete(req, res, next));

// --- Packages ---
router.get("/packages", (req, res, next) => PackageController.getAll(req, res, next));
router.get("/packages/:id", (req, res, next) => PackageController.getById(req, res, next));

// ServiceBooking
router.post("/servicebookings", (req, res, next) => ServiceBookingController.create(req, res, next));
router.get("/servicebookings", (req, res, next) => ServiceBookingController.list(req, res, next));
router.get("/servicebookings/:id", (req, res, next) => ServiceBookingController.getById(req, res, next));







export default router;