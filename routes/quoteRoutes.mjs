import express from "express";
import { body } from "express-validator";
import QuoteController from "../controllers/QuoteController.mjs";

const router = express.Router();

router.post(
  "/",
  body("service_name").isLength({ min: 1 }),
  body("price").isFloat({ min: 0 }),
  body("photographer_id").isLength({ min: 1 }),
  (req, res, next) => QuoteController.create(req, res, next)
);

router.get("/", (req, res, next) => QuoteController.list(req, res, next));

export default router;
