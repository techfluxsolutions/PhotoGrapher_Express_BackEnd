import express from "express";
import PhotographerController from "../../controllers/photographer/PhotographerController.mjs";
import PhotographerAuthController from "../../controllers/photographer/PhotographerAuthController.mjs";
import AvailabilityController from "../../controllers/User/AvailabilityController.mjs";
import JobController from "../../controllers/User/JobController.mjs";
import PayoutController from "../../controllers/User/PayoutController.mjs";
//import authMiddleware from "../../middleware/authMiddleware.mjs";
import { isPhotographer } from "../../middleware/isValid.Middleware.mjs";

const router = express.Router();

// --- Auth Routes ---
router.post("/auth/login", (req, res, next) => PhotographerAuthController.login(req, res, next));
router.post("/auth/forgot-password", (req, res, next) => PhotographerAuthController.forgotPassword(req, res, next));
router.post("/auth/reset-password", (req, res, next) => PhotographerAuthController.resetPassword(req, res, next));

// Apply Auth and Photographer check
//router.use(authMiddleware, isPhotographer);

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
router.get("/payouts", (req, res, next) => PayoutController.list(req, res, next)); // Controller might need filtering for 'my payouts'

// -- New Routes --


export default router;
