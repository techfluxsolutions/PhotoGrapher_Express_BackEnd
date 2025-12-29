import express from "express";
import PaymentController from "../controllers/PaymentController.mjs";
import authMiddleware from "../middleware/authmiddleware.mjs";

const router = express.Router();

router.use(authMiddleware);

router.post("/", PaymentController.create);
router.get("/", PaymentController.getAll);
router.get("/:id", PaymentController.getOne);
router.put("/:id", PaymentController.update);
router.delete("/:id", PaymentController.delete);
router.post("/:id/refund", PaymentController.refund);

export default router;
