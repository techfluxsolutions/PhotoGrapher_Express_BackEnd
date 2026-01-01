import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import {
  userRoutes,
  adminRoutes,
  photographerRoutes,
  authRoutes,
} from "./routes/index.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());
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

// --- Main Route Mounting ---
app.use("/api/auth", authRoutes);

// Detailed role-based routes
app.use("/api/admins", adminRoutes);
app.use("/api/photographers", photographerRoutes);
app.use("/api/users", userRoutes);

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

// Global Error Handler
import globalErrorHandler from "./middleware/errorMiddleware.mjs";
import AppError from "./utils/AppError.mjs";

// Handle 404
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

export default app;
