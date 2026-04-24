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
import DataLinksController from "../controllers/DataLinksController.js";
import PaymentController from "../controllers/User/PaymentController.mjs";
import CloudPlanController from "../controllers/Admin/CloudPlanController.mjs";
import CartController from "../controllers/User/CartController.mjs";
import EditingController from "../controllers/User/EditingController.mjs";
import PhotographyController from "../controllers/User/PhotographyController.mjs";
import TeamShootController from "../controllers/User/TeamShootController.mjs";
import CouponController from "../controllers/User/Coupon_Controller/CouponController.mjs";
const router = express.Router();
import { uploadController } from "../controllers/uploadController.js";
import HourlyShootBookingController from "../controllers/User/HourlyShootBookingController.mjs";
// Partner Registration (Public)
router.post("/partner-registration", (req, res, next) => PartnerRegistrationController.create(req, res, next));
router.get("/partner-registration", (req, res, next) => PartnerRegistrationController.getAll(req, res, next));

// Contact Us (Public)
router.post("/contact-us", (req, res, next) => ContactUsController.create(req, res, next));
router.get("/contact-us", (req, res, next) => ContactUsController.getAll(req, res, next));
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


// testinomials unprotected route
router.get("/getThreeRatings", (req, res, next) => ReviewAndRatingController.getThreeRatings(req, res, next));
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
router.post('/payment/create-order', (req, res, next) => PaymentController.createRazorpayOrder(req, res, next));
router.post('/payment/verify', (req, res, next) => PaymentController.verifyRazorpayPayment(req, res, next));

//hourly shoot payment
router.post('/cart/payment/create-order', (req, res, next) => PaymentController.createCartRazorpayOrder(req, res, next));
router.post('/cart/payment/verify', (req, res, next) => PaymentController.verifyCartPayment(req, res, next));

//create hourlyshoot
router.post('/createhourlyshootBooking', (req, res, next) => HourlyShootBookingController.createHourlyBooking);

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

// --- Cloud Plans ---
router.get("/cloud-plans", (req, res, next) => CloudPlanController.getAll(req, res, next));
router.get("/cloud-plans/:id", (req, res, next) => CloudPlanController.getOne(req, res, next));
router.post("/cloud-plans/create-order", (req, res, next) => CloudPlanController.createCloudPlanOrder(req, res, next));
router.post("/cloud-plans/verify", (req, res, next) => CloudPlanController.verifyCloudPlanPayment(req, res, next));



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
router.put("/reschedule/:id", (req, res, next) => ServiceBookingController.reschedule(req, res, next));

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

// s3 Stream (Protected: Only Client/Photographer linked to the file/booking can view)
router.get("/stream/:bookingId/*key", (req, res, next) => uploadController.streamProtectedFile(req, res, next));
router.post("/downloadZip", (req, res, next) => uploadController.downloadZip(req, res, next));
router.post("/downloadZiponFourtyPlus", (req, res, next) => uploadController.downloadZiponFourtyPlus(req, res, next));
router.post("/downloadSingleFile", (req, res, next) => uploadController.downloadSingleFile(req, res, next));
router.post("/downloadMultipleFiles", (req, res, next) => uploadController.downloadMultipleFiles(req, res, next));
router.post("/downloadSingleFile", (req, res, next) => uploadController.downloadSingleFile(req, res, next));

router.get("/getArrayImages/:bookingId", (req, res, next) => uploadController.getUrlsListArray(req, res, next));
// router.post("/deleteSingleFile", (req, res, next) => uploadController.deleteSingleS3File(req, res, next));
// router.post("/deleteMultipleFiles", (req, res, next) => uploadController.deleteMultipleS3Files(req, res, next));
// router.post("/deleteAllFiles", (req, res, next) => uploadController.deleteMultipleS3Files(req, res, next));

// --- Data Links ---
router.get("/datalinks", (req, res, next) => DataLinksController.getAll(req, res, next));
router.get("/datalinks/:id", (req, res, next) => DataLinksController.getById(req, res, next));

// --- Cart ---
router.post("/cart", (req, res, next) => CartController.addToCart(req, res, next));
router.get("/getcart", (req, res, next) => CartController.getMyCart(req, res, next));
// Moving /cart/:id routes to the bottom of the file to prevent catching exact routes

//editing plans
router.get("/editing-plans", (req, res, next) => EditingController.getAll(req, res, next));
router.get("/editing-plans/:id", (req, res, next) => EditingController.getOne(req, res, next));
router.get('/getplanBynumberOfVideos/:numberOfvideos', (req, res, next) => EditingController.getplanBynumberOfVideos(req, res, next));
router.get('/getplanBynumberOfVideos', (req, res, next) => EditingController.getplanByPlanCategory(req, res, next));
//photography plans
router.get("/photography-plans", (req, res, next) => PhotographyController.getAll(req, res, next));
router.get("/photography-plans/:id", (req, res, next) => PhotographyController.getOne(req, res, next));


// cart Apis

router.post("/cart/add", (req, res, next) => EditingController.addToCart(req, res, next));
router.get("/cart/mycart", (req, res, next) => EditingController.getMyCart(req, res, next));
router.post("/cart/updateQuantity", (req, res, next) => EditingController.updateQuantity(req, res, next));
router.get("/get-mycart", (req, res, next) => CartController.getMyCart(req, res, next));

// Generic cart routes (MUST BE DECLARED AFTER ALL OTHER /cart/ ROUTES)
router.get("/cart/:id", (req, res, next) => CartController.getOne(req, res, next));
router.put("/cart/:id", (req, res, next) => CartController.update(req, res, next));
router.delete("/cart/:id", (req, res, next) => CartController.delete(req, res, next));
// team shoot Apis
router.get("/team-shoots/:type", (req, res, next) => TeamShootController.getPlans(req, res, next));
router.post("/cart/team-shoots", (req, res, next) => TeamShootController.addTeamToCart(req, res, next));
router.post("/cart/update-quantity", (req, res, next) => CartController.updateItemQuantity(req, res, next));

// validate coupon 

router.post("/coupon/validate", CouponController.validateCoupon);
export default router;