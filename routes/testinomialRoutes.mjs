import express from "express";
const router = express.Router();
import TestimonialController from "../controllers/TestimonialController.mjs";

// Collection routes
router.post("/", (req, res, next) =>
  TestimonialController.create(req, res, next)
);
router.get("/", (req, res, next) => TestimonialController.list(req, res, next));

// Item routes
router.get("/:id", (req, res, next) => TestimonialController.getById(req, res, next));
router.put("/:id", (req, res, next) => TestimonialController.update(req, res, next));
router.delete("/:id", (req, res, next) => TestimonialController.delete(req, res, next));

export default router;