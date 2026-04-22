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
import PhotographerController from "../../controllers/photographer/PhotographerController.mjs"; // Added Import
import upload from "../../Config/multer.mjs";
import { downloadInvoice, downloadPartnerInvoice, testUserInvoice, testPartnerInvoice } from "../../controllers/Admin/InvoiceController.mjs";
import { chunkUpload } from "../../Config/chunkMulter.mjs";
import SubscribedUserController from "../../controllers/User/SubscribedUserController.mjs";
import AdminController from "../../controllers/User/AdminController.mjs";
import SidebarIconController from "../../controllers/Admin/SidebarIconController.mjs";
import RoleController from "../../controllers/Admin/RoleController.mjs";
import StaffController from "../../controllers/Admin/StaffController.mjs";
import PartnerRegistrationController from "../../controllers/PartnerRegistrationController.mjs";
import ContactUsController from "../../controllers/ContactUsController.mjs";
import CustomerController from "../../controllers/Admin/CustomerController.mjs";
import DataLinksController from "../../controllers/DataLinksController.js";
import ReviewAndRatingController from "../../controllers/User/ReviewAndRating.mjs";
import authMiddleware from "../../middleware/authmiddleware.mjs";
import CloudPlanController from "../../controllers/Admin/CloudPlanController.mjs";
import EditingController from "../../controllers/Admin/EditingPlanController.mjs";
import PhotographyPlanController from "../../controllers/Admin/PhotographyPlanController.mjs";
import AdminRevenueController from "../../controllers/Admin/AdminRevenueController.mjs";
import AdminTeamShootController from "../../controllers/Admin/AdminTeamShootController.mjs";

const router = express.Router();
import { uploadController } from "../../controllers/uploadController.js";
// --- Debug ---
router.get("/photographers/sorted", (req, res, next) => PhotographerController.getSortedPhotographers(req, res, next));
router.get("/photographers/videographers", (req, res, next) => PhotographerController.getSortedVideographers(req, res, next));
router.get("/photographers/lighting-setups", (req, res, next) => PhotographerController.getSortedLightingSetups(req, res, next));
router.get("/photographers/cinematographers", (req, res, next) => PhotographerController.getSortedCinematographers(req, res, next));

//sorting photographers
router.get("/photographers/sort", (req, res, next) => PhotographerController.getSortPhotographers(req, res, next));

// --- Admin Authentication (No middleware required) ---
router.post("/auth/login", (req, res, next) => AdminEmailAuthController.login(req, res, next));

// --- Test Invoice Formats (Temporary - No Auth) ---
router.get("/test/user-invoice", (req, res, next) => testUserInvoice(req, res, next));
router.get("/test/partner-invoice", (req, res, next) => testPartnerInvoice(req, res, next));
//
router.post("/uploadNineServices", (req, res, next) => ServiceController.uploadNineServices(req, res, next))

// Handle OPTIONS preflight requests for CORS (before authentication)
// router.use((req, res, next) => {
//   if (req.method === "OPTIONS") {
//     return res.status(200).end();/customers
//   }
//   next();
// });

// Apply Auth and Admin check to all routes below
router.use(authMiddleware);

// --- Cloud Plans Management ---
router.post("/cloud-plans", (req, res, next) => CloudPlanController.create(req, res, next));
router.get("/cloud-plans", (req, res, next) => CloudPlanController.getAll(req, res, next));
router.get("/cloud-plans/:id", (req, res, next) => CloudPlanController.getOne(req, res, next));
router.put("/cloud-plans/:id", (req, res, next) => CloudPlanController.update(req, res, next));
router.delete("/cloud-plans/:id", (req, res, next) => CloudPlanController.delete(req, res, next));

// --- Package Management ---
router.post("/packages", (req, res, next) => PackageController.create(req, res, next));
router.get("/packages", (req, res, next) => PackageController.getAll(req, res, next));
router.get("/packages/:id", (req, res, next) => PackageController.getOne(req, res, next));
router.put("/packages/:id", (req, res, next) => PackageController.update(req, res, next));
router.delete("/packages/:id", (req, res, next) => PackageController.delete(req, res, next));

// --- Photographer Management (Admin) ---
router.post("/photographers/unverified", (req, res, next) => PhotographerController.addUnverifiedPhotographer(req, res, next));
// router.get("/photographers/unverified", (req, res, next) => PhotographerController.getUnverifiedPhotographers(req, res, next)); // Removed - use /photographers?status=pending

router.post("/verify/sendOTP", (req, res, next) => PhotographerController.sendOTP(req, res, next));
router.post("/verify/verifyOTP", (req, res, next) => PhotographerController.verifyPhotographer(req, res, next));
router.post("/verify/verifyOTP/:id", (req, res, next) => PhotographerController.verifyPhotographer(req, res, next));
//router.post("/photographers/verify/:id", (req, res, next) => PhotographerController.verifyPhotographer(req, res, next));
router.post("/photographers/profile/:id", (req, res, next) => PhotographerController.createProfile(req, res, next));
router.get("/photographers/profile/:id", (req, res, next) => PhotographerController.getPhotographerById(req, res, next));
router.put("/photographers/unverified/:id", (req, res, next) => PhotographerController.updateUnverifiedPhotographer(req, res, next));
router.delete("/photographers/unverified/:id", (req, res, next) => PhotographerController.deletePhotographer(req, res, next));
router.put("/photographers/commissions", (req, res, next) => PhotographerController.updateCommissions(req, res, next));
router.get("/photographers/commissions", (req, res, next) => PhotographerController.getCommissions(req, res, next));

router.post("/photographers", (req, res, next) => PhotographerController.createPhotographer(req, res, next));
router.get("/photographers", (req, res, next) => PhotographerController.getAllPhotographers(req, res, next));
router.get("/photographers/:id", (req, res, next) => PhotographerController.getPhotographerById(req, res, next));
router.put("/photographers/:id", (req, res, next) => PhotographerController.updatePhotographer(req, res, next));
router.delete("/photographers/:id", (req, res, next) => PhotographerController.deletePhotographer(req, res, next));

// --- Service Management ---
router.post("/services", (req, res, next) => ServiceController.create(req, res, next));
router.get("/services", (req, res, next) => ServiceController.list(req, res, next));
router.get("/servicename", (req, res, next) => ServiceController.getServiceNameOnly(req, res, next));
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
router.get("/bookings/upcomming", (req, res, next) => ServiceBookingController.getUpcoming(req, res, next));
router.get("/bookings/previous", (req, res, next) => ServiceBookingController.getPrevious(req, res, next));
router.get("/bookings/:id", (req, res, next) => ServiceBookingController.getById(req, res, next));
router.patch("/bookings/assign-photographer", (req, res, next) => ServiceBookingController.assignPhotographer(req, res, next));
router.put("/bookings/:id", (req, res, next) => ServiceBookingController.update(req, res, next));
router.delete("/bookings/:id", (req, res, next) => ServiceBookingController.delete(req, res, next));
router.get("/getpreviousbookings", (req, res, next) => ServiceBookingController.getPrevious(req, res, next));
router.get("/completelyPaidBookings", (req, res, next) => ServiceBookingController.getCompletedBookings(req, res, next));
router.get("/bookings-chat-count", (req, res, next) => ServiceBookingController.getServiceBookingsWithChatCount(req, res, next));
router.get("/hourly-bookings", (req, res, next) => ServiceBookingController.getHourlyBookings(req, res, next));
router.get("/editing-bookings", (req, res, next) => ServiceBookingController.getEditingBookings(req, res, next));
router.get("/bookings/:id/gallery", (req, res, next) => ServiceBookingController.getGalleryByBookingId(req, res, next));


// --- ServiceBooking (alternative endpoint) ---
router.post("/servicebookings", (req, res, next) => ServiceBookingController.create(req, res, next));
router.get("/servicebookings", (req, res, next) => ServiceBookingController.list(req, res, next));
router.get("/servicebookings/:id", (req, res, next) => ServiceBookingController.getById(req, res, next));

// --- Quotes Management (Admin Controller) ---
router.post("/quotes", (req, res, next) => QuoteController.create(req, res, next));
router.get("/quotes", (req, res, next) => QuoteController.list(req, res, next));
router.get("/quotes/your-quotes", (req, res, next) => QuoteController.getYourQuotes(req, res, next));
router.get("/quotes/upcoming-bookings", (req, res, next) => QuoteController.getUpcomingBookings(req, res, next));
router.get("/quotes/upcomming-bookings", (req, res, next) => QuoteController.getUpcomingBookings(req, res, next));
router.get("/quotes/previous-bookings", (req, res, next) => QuoteController.getPreviousBookings(req, res, next));
router.get("/quotes/:id", (req, res, next) => QuoteController.getById(req, res, next));
router.put("/quotes/:id", (req, res, next) => QuoteController.update(req, res, next));
router.delete("/quotes/:id", (req, res, next) => QuoteController.delete(req, res, next));
router.get("/getquries", (req, res, next) => QuoteController.getQuries(req, res, next));
router.get("/quotes-unread-count", (req, res, next) => QuoteController.getQuotesWithUnreadCount(req, res, next));
router.post("/admin-quote", (req, res, next) => QuoteController.create(req, res, next));


// --- Payments Management (Admin Controller) ---
router.post("/payments", (req, res, next) => PaymentController.create(req, res, next));
router.get("/payments", (req, res, next) => PaymentController.list(req, res, next));
router.get("/payments/pending", (req, res, next) => PaymentController.getPending(req, res, next));
router.get("/payments/completed", (req, res, next) => PaymentController.getCompleted(req, res, next));
router.get("/payments/statistics", (req, res, next) => PaymentController.getStatistics(req, res, next));
router.get("/payments/:id", (req, res, next) => PaymentController.getById(req, res, next));
router.put("/payments/:id", (req, res, next) => PaymentController.update(req, res, next));
router.delete("/payments/:id", (req, res, next) => PaymentController.delete(req, res, next));

// --- Revenue ---
router.get("/revenue/dashboard", (req, res, next) => AdminRevenueController.getDashboard(req, res, next));
router.get("/revenue/top-photographers", (req, res, next) => AdminRevenueController.getTopPhotographers(req, res, next));

// --- Customers Management (Admin Controller) ---//
router.post("/customers", (req, res, next) => CustomerController.create(req, res, next));
router.get("/customers", (req, res, next) => CustomerController.list(req, res, next));
router.get("/customers/verified", (req, res, next) => CustomerController.getVerified(req, res, next));
router.get("/customers/unverified", (req, res, next) => CustomerController.getUnverified(req, res, next));
router.get("/customers/search", (req, res, next) => CustomerController.search(req, res, next));
router.get("/customers/statistics", (req, res, next) => CustomerController.getStatistics(req, res, next));
router.get("/customers/:clientId/booked-services", (req, res, next) => ServiceBookingController.getCustomerServicesSummary(req, res, next));
router.get("/customers/:id", (req, res, next) => CustomerController.getById(req, res, next));
router.put("/customers/:id", (req, res, next) => CustomerController.update(req, res, next));
router.delete("/customers/:id", (req, res, next) => CustomerController.delete(req, res, next));

// --- Invoice Management ---
router.get("/invoices/:bookingId", (req, res, next) => downloadInvoice(req, res, next));
router.get("/partner-invoices/:bookingId", (req, res, next) => downloadPartnerInvoice(req, res, next));

//Subscriber

router.get("/getsubscribers", (req, res, next) => SubscribedUserController.getAllSubscribers(req, res, next));
router.get("/getsubscriber/:id", (req, res, next) => SubscribedUserController.getSubscriberById(req, res, next));
router.get("/getsubscriber/email/:email", (req, res, next) => SubscribedUserController.getSubscriberByEmail(req, res, next));
router.put("/updatesubscriber/:id", (req, res, next) => SubscribedUserController.updateSubscriber(req, res, next));
router.delete("/deletesubscriber/:id", (req, res, next) => SubscribedUserController.deleteSubscriber(req, res, next));

// --- Sidebar Icons ---
router.get("/sidebar-icons", (req, res, next) => SidebarIconController.getAll(req, res, next));
router.post("/sidebar-icons/seed", (req, res, next) => SidebarIconController.seed(req, res, next));

// --- Role Management ---
router.post("/roles", (req, res, next) => RoleController.create(req, res, next));
router.get("/roles", (req, res, next) => RoleController.getAll(req, res, next));
router.get("/roles/:id", (req, res, next) => RoleController.getById(req, res, next));
router.put("/roles/:id", (req, res, next) => RoleController.update(req, res, next));
router.delete("/roles/:id", (req, res, next) => RoleController.delete(req, res, next));

// --- Staff Management ---
router.post("/staff", (req, res, next) => StaffController.create(req, res, next));
router.get("/staff", (req, res, next) => StaffController.getAll(req, res, next));
router.get("/staff/:id", (req, res, next) => StaffController.getById(req, res, next));
router.put("/staff/:id", (req, res, next) => StaffController.update(req, res, next));
router.delete("/staff/:id", (req, res, next) => StaffController.delete(req, res, next));

// --- Partner Registration Management ---
router.get("/partner-registrations", (req, res, next) => PartnerRegistrationController.getAll(req, res, next));
router.get("/partner-registrations/:id", (req, res, next) => PartnerRegistrationController.getById(req, res, next));

// --- Contact Us Management ---
router.get("/contact-submissions", (req, res, next) => ContactUsController.getAll(req, res, next));
router.get("/contact-submissions/:id", (req, res, next) => ContactUsController.getById(req, res, next));
router.delete("/contact-submissions/:id", (req, res, next) => ContactUsController.delete(req, res, next));


//rating and review

router.post("/giveRating", (req, res, next) => ReviewAndRatingController.create(req, res, next));
router.get("/getAdminRating", (req, res, next) => ReviewAndRatingController.getAdminRating(req, res, next));
router.put("/editRating/:ratingId", (req, res, next) => ReviewAndRatingController.editRating(req, res, next));

// --- Data Links Management ---
router.get("/datalinks", (req, res, next) => DataLinksController.getAll(req, res, next));
router.get("/datalinks/:id", (req, res, next) => DataLinksController.getById(req, res, next));

// --- Photo Upload Routes ---
router.post("/start", uploadController.startUpload);
router.post("/get-part-url", uploadController.getPartUploadUrl);
router.post("/chunk", chunkUpload.single("chunk"), uploadController.uploadChunk);
router.post("/complete", uploadController.completeUpload);
router.post("/abort", uploadController.abortUpload);

// Support streaming and batch downloading
router.get("/stream/:bookingId/*key", (req, res, next) => uploadController.streamProtectedFile(req, res, next));
router.get("/downloadZip", (req, res, next) => uploadController.downloadZip(req, res, next));
router.get("/downloadZiponFourtyPlus", (req, res, next) => uploadController.downloadZiponFourtyPlus(req, res, next));
router.get("/downloadSingleFile", (req, res, next) => uploadController.downloadSingleFile(req, res, next));

router.post("/download-zip", (req, res, next) => uploadController.downloadZip(req, res, next));
router.post("/downloadZip", (req, res, next) => uploadController.downloadZip(req, res, next));
router.post("/downloadZiponFourtyPlus", (req, res, next) => uploadController.downloadZiponFourtyPlus(req, res, next));
router.post("/downloadSingleFile", (req, res, next) => uploadController.downloadSingleFile(req, res, next));
router.post("/downloadMultipleFiles", (req, res, next) => uploadController.downloadMultipleFiles(req, res, next));
router.post("/deleteSingleFile", (req, res, next) => uploadController.deleteSingleS3File(req, res, next));
router.post("/deleteMultipleFiles", (req, res, next) => uploadController.deleteMultipleS3Files(req, res, next));
router.delete("/deleteAllFiles/:bookingId", (req, res, next) => uploadController.deleteAllS3Files(req, res, next));

router.get("/getArrayImages/:bookingId", (req, res, next) => uploadController.getUrlsListArray(req, res, next));


// --- Editing Plan Management ---
router.post("/editing-plans", (req, res, next) => EditingController.create(req, res, next));
router.get("/editing-plans", (req, res, next) => EditingController.getAll(req, res, next));
router.get("/editing-plans/:id", (req, res, next) => EditingController.getById(req, res, next));
router.put("/editing-plans/:id", (req, res, next) => EditingController.update(req, res, next));
router.delete("/editing-plans/:id", (req, res, next) => EditingController.delete(req, res, next));

// --- Photography Plan Management ---
router.post("/photography-plans", (req, res, next) => PhotographyPlanController.create(req, res, next));
router.get("/photography-plans", (req, res, next) => PhotographyPlanController.getAll(req, res, next));
router.get("/photography-plans/:id", (req, res, next) => PhotographyPlanController.getById(req, res, next));
router.put("/photography-plans/:id", (req, res, next) => PhotographyPlanController.update(req, res, next));
router.delete("/photography-plans/:id", (req, res, next) => PhotographyPlanController.delete(req, res, next));


// --- Team Shoot Plan Management ---
router.post("/team-shoot-plans", (req, res, next) => AdminTeamShootController.create(req, res, next));
router.get("/team-shoot-plans", (req, res, next) => AdminTeamShootController.getAll(req, res, next));
router.get("/team-shoot-plans/:id", (req, res, next) => AdminTeamShootController.getById(req, res, next));
router.put("/team-shoot-plans/:id", (req, res, next) => AdminTeamShootController.update(req, res, next));
router.delete("/team-shoot-plans/:id", (req, res, next) => AdminTeamShootController.delete(req, res, next));

// --- Admin Management (MUST BE LAST - generic /:id routes) ---
router.post("/", upload.single("avatar"), (req, res, next) => AdminController.create(req, res, next));
router.get("/", (req, res, next) => AdminController.getAll(req, res, next));
router.put("/:id/status", (req, res, next) => AdminController.changeStatus(req, res, next));
router.get("/:id", (req, res, next) => AdminController.getById(req, res, next));
router.put("/:id", (req, res, next) => AdminController.update(req, res, next));
router.delete("/:id", (req, res, next) => AdminController.delete(req, res, next));


export default router;
