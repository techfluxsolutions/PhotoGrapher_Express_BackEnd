import express from "express";
import ServiceController from "../controllers/ServiceController.mjs";
import authMiddleware from "../middleware/authmiddleware.mjs";
import { validate } from "../middleware/validator.mjs";
import { check } from "express-validator";

const router = express.Router();

// Public
router.get("/", ServiceController.getAll);
router.get("/:id", ServiceController.getOne);

import upload from "../middleware/multerConfig.mjs";

// Protected
router.use(authMiddleware);
router.post(
  "/",
  upload.single("image"),
  validate([
    check("serviceName").notEmpty().withMessage("Service name is required"),
    check("serviceCost").notEmpty().withMessage("Service cost is required"),
  ]),
  ServiceController.create
);
router.put("/:id", upload.single("image"), ServiceController.update);
router.delete("/:id", ServiceController.delete);

export default router;
