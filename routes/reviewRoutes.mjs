import express from "express";
import ReviewController from "../controllers/ReviewController.mjs";
import authMiddleware from "../middleware/authmiddleware.mjs";

const router = express.Router();

router.use(authMiddleware);

router.post("/", ReviewController.create);
router.get("/", ReviewController.getAll);
router.get("/:id", ReviewController.getOne);
router.put("/:id", ReviewController.update);
router.delete("/:id", ReviewController.delete);

export default router;
