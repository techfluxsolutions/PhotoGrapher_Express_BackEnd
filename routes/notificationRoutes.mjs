import express from "express";
import NotificationController from "../controllers/NotificationController.mjs";
import authMiddleware from "../middleware/authmiddleware.mjs";

const router = express.Router();

router.use(authMiddleware);

router.post("/", NotificationController.create);
router.get("/", NotificationController.getAll);
router.get("/:id", NotificationController.getOne);
router.put("/:id", NotificationController.update);
router.delete("/:id", NotificationController.delete);

export default router;
