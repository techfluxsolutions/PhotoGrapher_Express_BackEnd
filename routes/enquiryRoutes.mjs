import express from "express";
import { body } from "express-validator";
import EnquiryController from "../controllers/EnquiryController.mjs";

const router = express.Router();

router.post(
  "/",
  body("mobile_number").isMobilePhone("any"),
  body("name").isLength({ min: 1 }),
  (req, res, next) => EnquiryController.create(req, res, next)
);

export default router;
