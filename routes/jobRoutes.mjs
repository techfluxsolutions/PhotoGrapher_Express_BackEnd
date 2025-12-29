import express from "express";
import JobController from "../controllers/JobController.mjs";
import authMiddleware from "../middleware/authmiddleware.mjs";

const router = express.Router();

router.use(authMiddleware);

router.post("/", JobController.create);
router.get("/", JobController.getAll);
router.get("/:id", JobController.getOne);
router.put("/:id", JobController.update);
router.delete("/:id", JobController.delete);

export default router;
