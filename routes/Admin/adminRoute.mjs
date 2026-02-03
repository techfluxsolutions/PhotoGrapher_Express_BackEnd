import express from "express";
import PackageController from "../../controllers/User/PackageController.mjs";
import ServiceController from "../../controllers/User/ServiceController.mjs";
import PayoutController from "../../controllers/User/PayoutController.mjs";
import EnquiryController from "../../controllers/User/EnquiryController.mjs";
import ReviewController from "../../controllers/User/ReviewController.mjs";
import ServiceBookingController from "../../controllers/Admin/ServiceBookingController.mjs";
import QuoteController from "../../controllers/Admin/QuoteController.mjs";
import PaymentController from "../../controllers/Admin/PaymentController.mjs";
import AdminEmailAuthController from "../../controllers/Admin/AdminEmailAuthController.mjs";
import upload from "../../Config/multer.mjs";
import { downloadInvoice } from "../../controllers/Admin/InvoiceController.mjs";
import SubscribedUserController from "../../controllers/User/SubscribedUserController.mjs";
import AdminController from "../../controllers/User/AdminController.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
const router = express.Router();

// --- Admin Authentication (No middleware required) ---
router.post("/auth/login", (req, res, next) => AdminEmailAuthController.login(req, res, next));
//
router.post("/uploadNineServices", (req, res, next) => ServiceController.uploadNineServices(req, res, next))

// Handle OPTIONS preflight requests for CORS (before authentication)
// router.use((req, res, next) => {
//   if (req.method === "OPTIONS") {
//     return res.status(200).end();
//   }
//   next();
// });

// Apply Auth and Admin check to all routes below
router.use(authMiddleware);

// --- Package Management ---
router.post("/packages", (req, res, next) => PackageController.create(req, res, next));
router.get("/packages", (req, res, next) => PackageController.getAll(req, res, next));
router.get("/packages/:id", (req, res, next) => PackageController.getOne(req, res, next));
router.put("/packages/:id", (req, res, next) => PackageController.update(req, res, next));
router.delete("/packages/:id", (req, res, next) => PackageController.delete(req, res, next));

// --- Service Management ---
router.post("/services", (req, res, next) => ServiceController.create(req, res, next));
router.get("/services", (req, res, next) => ServiceController.list(req, res, next));
router.get("/services/names-only", (req, res, next) => ServiceController.getServiceNamesAndAdditional(req, res, next));
router.get("/services/:id", (req, res, next) => ServiceController.getById(req, res, next));
router.put("/services/:id", (req, res, next) => ServiceController.update(req, res, next));
router.delete("/services/:id", (req, res, next) => ServiceController.delete(req, res, next));

// --- Additional Service Management ---
router.get("/additional-services/:serviceId", (req, res, next) => ServiceController.getAdditionalServicesByServiceId(req, res, next));
router.patch("/additional-services/:id", (req, res, next) => ServiceController.updateAdditionalService(req, res, next));

// --- Enquiries ---
router.post("/enquiries", (req, res, next) => EnquiryController.create(req, res, next));
router.get("/enquiries", (req, res, next) => EnquiryController.list(req, res, next));

// --- Reviews Management ---
router.post("/reviews", (req, res, next) => ReviewController.create(req, res, next));
router.put("/reviews/:id", (req, res, next) => ReviewController.update(req, res, next));
router.delete("/reviews/:id", (req, res, next) => ReviewController.delete(req, res, next));

// --- Payouts ---
router.get("/payouts", (req, res, next) => PayoutController.list(req, res, next));

// --- Bookings Management (Admin Controller) ---
router.post("/bookings", (req, res, next) => ServiceBookingController.create(req, res, next));
router.get("/bookings", (req, res, next) => ServiceBookingController.list(req, res, next));
router.get("/bookings/upcoming", (req, res, next) => ServiceBookingController.getUpcoming(req, res, next));
router.get("/bookings/previous", (req, res, next) => ServiceBookingController.getPrevious(req, res, next));
router.get("/bookings/:id", (req, res, next) => ServiceBookingController.getById(req, res, next));
router.put("/bookings/:id", (req, res, next) => ServiceBookingController.update(req, res, next));
router.delete("/bookings/:id", (req, res, next) => ServiceBookingController.delete(req, res, next));
router.get("/getpreviousbookings", (req, res, next) => ServiceBookingController.getPrevious(req, res, next));
router.get("/completelyPaidBookings", (req, res, next) => ServiceBookingController.getCompletedBookings(req, res, next));


// --- ServiceBooking (alternative endpoint) ---
router.post("/servicebookings", (req, res, next) => ServiceBookingController.create(req, res, next));
router.get("/servicebookings", (req, res, next) => ServiceBookingController.list(req, res, next));
router.get("/servicebookings/:id", (req, res, next) => ServiceBookingController.getById(req, res, next));

// --- Quotes Management (Admin Controller) ---
router.post("/quotes", (req, res, next) => QuoteController.create(req, res, next));
router.get("/quotes", (req, res, next) => QuoteController.list(req, res, next));
router.get("/quotes/your-quotes", (req, res, next) => QuoteController.getYourQuotes(req, res, next));
router.get("/quotes/upcoming-bookings", (req, res, next) => QuoteController.getUpcomingBookings(req, res, next));
router.get("/quotes/previous-bookings", (req, res, next) => QuoteController.getPreviousBookings(req, res, next));
router.get("/quotes/:id", (req, res, next) => QuoteController.getById(req, res, next));
router.put("/quotes/:id", (req, res, next) => QuoteController.update(req, res, next));
router.delete("/quotes/:id", (req, res, next) => QuoteController.delete(req, res, next));

// --- Payments Management (Admin Controller) ---
router.post("/payments", (req, res, next) => PaymentController.create(req, res, next));
router.get("/payments", (req, res, next) => PaymentController.list(req, res, next));
router.get("/payments/pending", (req, res, next) => PaymentController.getPending(req, res, next));
router.get("/payments/completed", (req, res, next) => PaymentController.getCompleted(req, res, next));
router.get("/payments/statistics", (req, res, next) => PaymentController.getStatistics(req, res, next));
router.get("/payments/:id", (req, res, next) => PaymentController.getById(req, res, next));
router.put("/payments/:id", (req, res, next) => PaymentController.update(req, res, next));
router.delete("/payments/:id", (req, res, next) => PaymentController.delete(req, res, next));

// --- Customers Management (Admin Controller) ---
router.post("/customers", (req, res, next) => CustomerController.create(req, res, next));
router.get("/customers", (req, res, next) => CustomerController.list(req, res, next));
router.get("/customers/verified", (req, res, next) => CustomerController.getVerified(req, res, next));
router.get("/customers/unverified", (req, res, next) => CustomerController.getUnverified(req, res, next));
router.get("/customers/search", (req, res, next) => CustomerController.search(req, res, next));
router.get("/customers/statistics", (req, res, next) => CustomerController.getStatistics(req, res, next));
router.get("/customers/:id", (req, res, next) => CustomerController.getById(req, res, next));
router.put("/customers/:id", (req, res, next) => CustomerController.update(req, res, next));
router.delete("/customers/:id", (req, res, next) => CustomerController.delete(req, res, next));

// --- Invoice Management ---
router.get("/invoices/:bookingId", (req, res, next) => downloadInvoice(req, res, next));

//Subscriber

router.get("/getsubscribers", (req, res, next) => SubscribedUserController.getAllSubscribers(req, res, next));
router.get("/getsubscriber/:id", (req, res, next) => SubscribedUserController.getSubscriberById(req, res, next));
router.get("/getsubscriber/email/:email", (req, res, next) => SubscribedUserController.getSubscriberByEmail(req, res, next));
router.put("/updatesubscriber/:id", (req, res, next) => SubscribedUserController.updateSubscriber(req, res, next));
router.delete("/deletesubscriber/:id", (req, res, next) => SubscribedUserController.deleteSubscriber(req, res, next));

// --- Admin Management (MUST BE LAST - generic /:id routes) ---
router.post("/", upload.single("avatar"), (req, res, next) => AdminController.create(req, res, next));
router.get("/", (req, res, next) => AdminController.getAll(req, res, next));
router.get("/:id", (req, res, next) => AdminController.getById(req, res, next));
router.put("/:id", (req, res, next) => AdminController.update(req, res, next));
router.delete("/:id", (req, res, next) => AdminController.delete(req, res, next));


export default router;
