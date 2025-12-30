import express from "express";
import { body } from "express-validator";
import AuthController from "../controllers/AuthController.mjs";

const router = express.Router();
// User Send OTP and Verify OTP routes
router.post("/sendOTP", (req, res, next) =>
  AuthController.sendOTP(req, res, next)
);

router.post("/checkOTP", (req, res, next) =>
  AuthController.verifyOTP(req, res, next)
);

// photographer routes
router.post(
  "/login-photographer",
  body("username").isLength({ min: 1 }),
  body("password").isLength({ min: 6 }),
  (req, res, next) => AuthController.loginPhotographer(req, res, next)
);

// Admin Routes
router.post(
  "/admin-login",
  body("username").isLength({ min: 1 }),
  body("password").isLength({ min: 6 }),
  (req, res, next) => AuthController.adminLogin(req, res, next)
);

export default router;
