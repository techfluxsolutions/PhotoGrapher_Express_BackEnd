import express from "express";
import AvailabilityController from "../controllers/AvailabilityController.mjs";
import authMiddleware from "../middleware/authmiddleware.mjs";

const router = express.Router();

router.use(authMiddleware); // Protect all routes

router.post("/", AvailabilityController.create);
router.get("/", AvailabilityController.getAll);
router.get("/:id", AvailabilityController.getOne);
router.put("/:id", AvailabilityController.update);
router.delete("/:id", AvailabilityController.delete);

export default router;
