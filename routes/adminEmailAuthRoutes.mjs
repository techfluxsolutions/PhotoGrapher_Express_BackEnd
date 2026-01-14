import express from "express";
import AdminEmailAuthController from "../controllers/User/AdminEmailAuthController.mjs";

const router = express.Router();

// Admin email/password login endpoint
router.post("/login", (req, res, next) =>
  AdminEmailAuthController.login(req, res, next)
);

export default router;
