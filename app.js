import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import {userRoutes,
    adminRoutes,
    photographerRoutes,
    authRoutes,
    enquiryRoutes,
    quoteRoutes,
    availabilityRoutes,
    jobRoutes,
    notificationRoutes,
    packageRoutes,
    paymentRoutes,
    payoutRoutes,
    reviewRoutes,
    serviceRoutes,
    subscriptionRoutes ,testinomialRoutes} from "./routes/index.js";
import cookieParser from "cookie-parser";
dotenv.config();

const app = express();
const port = process.env.PORT;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5173",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// cookies

app.use(express.json());
app.use(cookieParser());

// Mount user routes
app.use("/api/users", userRoutes);
// Mount auth routes
app.use("/auth", authRoutes);
// Mount enquiries
app.use("/api/enquiries", enquiryRoutes);
// Quotes
app.use("/api/quotes", quoteRoutes);
// Mount admin routes
app.use("/api/admins", adminRoutes);
// Mount photographer routes
app.use("/api/photographers", photographerRoutes);
// Mount new routes
app.use("/api/availabilities", availabilityRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/payouts", payoutRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/testimonials", testinomialRoutes);

// Optional mongoose connection if MONGODB_URI is provided
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB connected"))
    .catch((err) => console.error("MongoDB connection error:", err));
}

// Sample route
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Simple error handler
import globalErrorHandler from "./middleware/errorMiddleware.mjs";
import AppError from "./utils/AppError.mjs";

// Handle 404
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(globalErrorHandler);

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

export default app;
