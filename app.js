import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { initSocket } from "./services/SocketService.mjs";
import {
  userRoutes,
  adminRoutes,
  photographerRoutes,
  authRoutes,
  chatRoutes,
} from "./routes/index.js";

dotenv.config();

const app = express();
const server = http.createServer(app); // Create HTTP server
const port = process.env.PORT || 5002;

// Initialize Socket.IO
initSocket(server);

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://api-photographer.techfluxsolutions.com",
        "https://photographer.techfluxsolutions.com",
        "https://admin-photographer.techfluxsolutions.com",
      ];

      const isLocalhost = origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
      const isTechFlux = origin.endsWith(".techfluxsolutions.com");

      if (allowedOrigins.indexOf(origin) !== -1 || isLocalhost || isTechFlux) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With", "Origin"],
    credentials: true,
  })
);

// --- Main Route Mounting ---
app.use("/api/auth", authRoutes);

// Detailed role-based routes
app.use("/api/admins", adminRoutes);
app.use("/api/photographers", photographerRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes); // Mount Chat Routes


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
server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

export default app;
