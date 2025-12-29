import express from "express";
import SubscriptionController from "../controllers/SubscriptionController.mjs";
import authMiddleware from "../middleware/authmiddleware.mjs";

const router = express.Router();

router.use(authMiddleware);

router.post("/", SubscriptionController.create);
router.get("/", SubscriptionController.getAll);
router.get("/:id", SubscriptionController.getOne);
router.put("/:id", SubscriptionController.update);
router.delete("/:id", SubscriptionController.delete);

export default router;
