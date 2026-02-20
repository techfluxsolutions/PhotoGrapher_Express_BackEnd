import express from "express";
import AuthController from "../controllers/User/AuthController.mjs";

const router = express.Router();
// User Send OTP and Verify OTP routes
router.post("/login", (req, res, next) =>
  AuthController.sendOTP(req, res, next)
);

router.post("/verify", (req, res, next) =>
  AuthController.verifyOTP(req, res, next)
);

// getToken route
router.post('/getToken', (req, res, next) => AuthController.getToken(req, res, next));


export default router;
