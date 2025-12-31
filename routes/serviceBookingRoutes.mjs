import express from "express";
const router = express.Router();
import ServiceBookingController from "../controllers/ServiceBookingController.mjs";

// Collection routes
router.post("/", (req, res, next) =>
  ServiceBookingController.create(req, res, next)
);
router.get("/", (req, res, next) =>
  ServiceBookingController.list(req, res, next)
);

// Item routes
router.get("/:id", (req, res, next) =>
  ServiceBookingController.getById(req, res, next)
);
router.put("/:id", (req, res, next) =>
  ServiceBookingController.update(req, res, next)
);
router.delete("/:id", (req, res, next) =>
  ServiceBookingController.delete(req, res, next)
);

export default router;
