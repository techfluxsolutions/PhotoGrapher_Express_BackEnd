import express from "express";
import mobileBookingRoutes from "./mobileBookingRoutes.mjs";

const router = express.Router();

// Mount mobile booking routes under /api/.../mobile/user or similar?
// Usually, we just map it. In app.js it will be app.use('/api/mobile', mobileRoutes)
router.use("/", mobileBookingRoutes);

export default router;
