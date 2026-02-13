import express from "express";
import UserController from "../controllers/User/UserController.mjs";
import EnquiryController from "../controllers/User/EnquiryController.mjs";
import ReviewController from "../controllers/User/ReviewController.mjs";
import ServiceBookingController from "../controllers/User/ServiceBookingController.mjs";
import PersonalizedQuoteController from "../controllers/User/PersonalizedQuoteController.mjs";
import ServiceController from "../controllers/User/ServiceController.mjs";
import FAQController from "../controllers/User/FAQController.mjs";
import authMiddleware from "../middleware/authmiddleware.mjs";
import QuoteController from "../controllers/User/QuoteController.mjs";
import PackageController from "../controllers/User/PackageController.mjs";
import createUploader from "../Config/uploadCreate.js";
import AdditionalServicesController from "../controllers/User/AdditionalServicesController.mjs";
import TicketController from "../controllers/User/TicketController.mjs";
import ReviewAndRatingController from "../controllers/User/ReviewAndRating.mjs";
import SubscribedUserController from "../controllers/User/SubscribedUserController.mjs";
import PartnerRegistrationController from "../controllers/PartnerRegistrationController.mjs";
import ContactUsController from "../controllers/ContactUsController.mjs";
const router = express.Router();

// Partner Registration (Public)
router.post("/partner-registration", (req, res, next) => PartnerRegistrationController.create(req, res, next));

// Contact Us (Public)
router.post("/contact-us", (req, res, next) => ContactUsController.create(req, res, next));

// router.use(authMiddleware); // Removed global auth middleware to allow public routes


// multer image upload this function sets the path of the image and its directory 

const uploadAvatar = createUploader({
    folder: "uploads/userProfile",
    maxSizeMB: 2,
    allowedTypes: /jpeg|jpg|png/,
});

const uploadTicketAttachment = createUploader({
    folder: "uploads/ticketAttachments",
    maxSizeMB: 5,
    allowedTypes: /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip|rar/,
});


// Public Routes (Optional, can be separate)
router.get("/services", (req, res, next) => ServiceController.getAll(req, res, next));
router.get("/faqs", (req, res, next) => FAQController.getAll(req, res, next));
router.get("/reviews", (req, res, next) => ReviewController.getAll(req, res, next));

// Subscribed User
router.post("/subscribe", (req, res, next) => SubscribedUserController.createSubscriber(req, res, next));

// service name 

router.get("/servicename", (req, res, next) => ServiceController.getServiceNameOnly(req, res, next));
router.get("/services/:id", (req, res, next) => ServiceController.getById(req, res, next));


// Protected Routes
router.use(authMiddleware);

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
// --- incomplete booking ---
router.get("/incompleteBookings", (req, res, next) => ServiceBookingController.getIncompleteBookings(req, res, next));

// booking payment
router.put('/updatePaymentStatusBooking/:id', (req, res, next) => ServiceBookingController.updatePaymentStatusBooking(req, res, next));
// --- Quotes ---
router.post("/quotes", (req, res, next) => QuoteController.create(req, res, next));
router.get("/quotes", (req, res, next) => QuoteController.getAll(req, res, next));
router.get("/quotes/:id", (req, res, next) => QuoteController.getById(req, res, next));
router.put("/quotes/:id", (req, res, next) => QuoteController.update(req, res, next));
router.delete("/quotes/:id", (req, res, next) => QuoteController.delete(req, res, next));
router.get("/quotes/status/:status", (req, res) => QuoteController.getByStatus(req, res));
router.put("/quotes/changeStatus/:id", (req, res, next) => QuoteController.changeStatus(req, res, next));
router.post("/quotes/convertToBooking/:quoteId", (req, res, next) => QuoteController.QuoteConverToBookings(req, res, next));


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



// additional services

router.post("/createadditionalServices", (req, res, next) => AdditionalServicesController.create(req, res, next));
router.put("/updateadditionalServices/:id", (req, res, next) => AdditionalServicesController.update(req, res, next));
router.delete("/deleteadditionalServices/:id", (req, res, next) => AdditionalServicesController.delete(req, res, next));
// service price

router.get("/serviceprice", (req, res, next) => ServiceController.getServicePrice(req, res, next));
router.get("/personalized/serviceprice/:serviceId", (req, res) => ServiceController.getServicePriceByServiceId(req, res));
// --- Packages ---
router.get("/packages", (req, res, next) => PackageController.getAll(req, res, next));
router.get("/packages/:id", (req, res, next) => PackageController.getById(req, res, next));

// ServiceBooking
router.post("/servicebookings", (req, res, next) => ServiceBookingController.create(req, res, next));
router.get("/servicebookings", (req, res, next) => ServiceBookingController.list(req, res, next));
router.get("/servicebookings/:id", (req, res, next) => ServiceBookingController.getById(req, res, next));
router.put("/servicebookings/:id", (req, res, next) => ServiceBookingController.cancelBooking(req, res, next));
router.get("/getpreviousbookings", (req, res, next) => ServiceBookingController.getPreviousBookings(req, res, next));

//Ticket Routes
router.post("/raiseTicket", uploadTicketAttachment.single("attachment"), (req, res, next) => TicketController.create(req, res, next));
router.get("/allTickets", (req, res, next) => TicketController.getAll(req, res, next));
router.get("/getTicket/:id", (req, res, next) => TicketController.getById(req, res, next));
router.put("/updateTicket/:id", uploadTicketAttachment.single("attachment"), (req, res, next) => TicketController.update(req, res, next));
router.delete("/deleteTicket/:id", (req, res, next) => TicketController.delete(req, res, next));

router.get("/getPreviousTickets/:clientId", (req, res, next) => TicketController.getPreviousTickets(req, res, next));

//Review And Rating
router.post("/reviewAndRating", (req, res, next) => ReviewAndRatingController.create(req, res, next));
router.get("/getReviewAndRating", (req, res, next) => ReviewAndRatingController.getAll(req, res, next));
router.get("/getThreeRatings", (req, res, next) => ReviewAndRatingController.getThreeRatings(req, res, next));









export default router;