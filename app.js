// Handle uncaught exceptions globally
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import path from "path";
import { initSocket } from "./services/SocketService.mjs";
import {
  userRoutes,
  adminRoutes,
  photographerRoutes,
  authRoutes,
  chatRoutes,
  mobileRoutes,
} from "./routes/index.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import webHookRoutes from "./routes/WebHookRoutes/webHookRoutes.mjs";

// Production required utilities and middlewares
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
// import xss from "xss-clean"; // Does not support Express 5
import rateLimit from "express-rate-limit";
import compression from "compression";
import morgan from "morgan";
import logger from "./utils/logger.mjs";

//

//

const app = express();
const server = http.createServer(app); // Create HTTP server
const port = process.env.PORT || 5002;

initSocket(server);

// ==========================================
// 1) LOGGING
// ==========================================
// Request Logging using Morgan and Winston
app.use(morgan("combined", { stream: { write: (message) => logger.info(message.trim()) } }));

// ==========================================
// 2) SECURITY MIDDLEWARE
// ==========================================
// Set security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Required if serving assets across origins
}));

// Limit requests from same API (prevent brute force / DDoS)
const limiter = rateLimit({
  max: 1500, // Generous limit for APIs
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: "Too many requests from this IP, please try again in 15 minutes!",
});
app.use("/api", limiter);

// ==========================================
// 3) BODY PARSERS & SANITIZATION
// ==========================================
// Webhook Route (Must be parsed as raw body before express.json)
app.use(webHookRoutes);

// Middleware to parse JSON bodies with size limit for security
app.use(express.json({ limit: "200kb" }));

// Data sanitization against NoSQL query injection
// app.use(mongoSanitize()); // Removed due to Express 5 TypeError: Cannot set property query of #<IncomingMessage>

// Data sanitization against XSS
// app.use(xss()); // Removed due to Express 5 TypeError: Cannot set property query of #<IncomingMessage>

// ==========================================
// 4) PERFORMANCE TUNING
// ==========================================
// Compress responses
app.use(compression(
  {
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }
));

// Request Timeout Protection..
app.use((req, res, next) => {
  // Increase timeout for specific long-running paths (Download/Stream)
  if (req.path.includes('/download') || req.path.includes('/stream') || req.path.includes('/zip')) {
    res.setTimeout(600000); // 10 minutes
  } else {
    res.setTimeout(30000, () => { // 30 seconds for normal routes
      if (!res.headersSent) {
        res.status(408).send('Request Timeout');
      }
    });
  }
  next();
});
app.use(cookieParser());
app.use("/uploads", express.static(path.resolve("uploads")));
app.use("/assests", express.static(path.resolve("assests")));

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "https://dev.veroastudioz.com",
  "https://veroastudioz.com",
  "https://superadmin-9xk2lmq7zap3rt8.veroastudioz.com",
  "https://photographer-admin.vercel.app",
  "https://photo-grapher-user-website.vercel.app",
  "https://user-photographer.techfluxsolutions.com",
  "https://admin-photographer.techfluxsolutions.com",
  "https://photographer-veroa.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.log("CORS blocked origin:", origin);
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
      "Origin",
    ],
  })
);

// --- System Monitoring Route --
// Health check endpoint for uptime monitoring
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Welcome to PhotoGrapher App API!",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// --- Main Route Mounting ----
app.use("/api/auth", authRoutes);

// Detailed role-based routes
app.use("/api/admins", adminRoutes);
app.use("/api/photographers", photographerRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/mobile", mobileRoutes);

// Mount S3 Large Upload/Streaming Module
app.use("/upload", uploadRoutes);

// Optional mongoose connection if MONGODB_URI is provided..
console.log("MONGODB_URI defined:", !!process.env.MONGODB_URI);
if (process.env.MONGODB_URI) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      console.log("✅ MongoDB successfully connected to:", process.env.MONGODB_URI.split('@')[1]);
    })
    .catch((err) => {
      console.error("❌ MongoDB connection error:", err.message);
    });
} else {
  console.error("⚠️ MONGODB_URI is not defined in environment variables!");
}

// Sample route
app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Global Error Handler
import globalErrorHandler from "./middleware/errorMiddleware.mjs"
import AppError from "./utils/AppError.mjs";

// Handle 404
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

// Start the server
server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  // logger.info(`Server started on http://localhost:${port}`);
});

// Handle unhandled rejections globally
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown on SIGTERM (e.g. from Heroku/Vercel/Docker)
process.on("SIGTERM", () => {
  console.info("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.info("💥 Process terminated!");
  });
});

export default app;
