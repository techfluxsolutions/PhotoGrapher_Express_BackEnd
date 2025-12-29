import express from "express";
import PayoutController from "../controllers/PayoutController.mjs";
import authMiddleware from "../middleware/authmiddleware.mjs";

const router = express.Router();

router.use(authMiddleware);

router.post("/", PayoutController.create);
router.get("/", PayoutController.getAll);
router.get("/:id", PayoutController.getOne);
router.put("/:id", PayoutController.update);
router.delete("/:id", PayoutController.delete);

export default router;
