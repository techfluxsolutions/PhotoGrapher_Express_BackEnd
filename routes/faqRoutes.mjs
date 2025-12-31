import express from "express";
const router = express.Router();
import FAQController from "../controllers/FAQController.mjs";

// Collection routes
router.post("/", (req, res, next) => FAQController.create(req, res, next));
router.get("/", (req, res, next) => FAQController.list(req, res, next));

// Item routes
router.get("/:id", (req, res, next) => FAQController.getById(req, res, next));
router.put("/:id", (req, res, next) => FAQController.update(req, res, next));
router.delete("/:id", (req, res, next) => FAQController.delete(req, res, next));

export default router;
