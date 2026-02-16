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
} from "./routes/index.js";


//

//

const app = express();
const server = http.createServer(app); // Create HTTP server
const port = process.env.PORT || 5002;

initSocket(server);

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.resolve("uploads")));
app.use("/assests", express.static(path.resolve("assests")));
// app.use(
//   cors({
//     origin: [
//       "http://localhost:3000",
//       "http://localhost:5173",
//       "https://photographer-admin.vercel.app",
//       "https://photo-grapher-user-website.vercel.app",
//       "https://photo-grapher-user-website.vercel.app",
//     ],
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     allowedHeaders: [
//       "Content-Type",
//       "Authorization",
//       "Accept",
//       "X-Requested-With",
//       "Origin",
//     ],
//   })
// );

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
  "https://admin-photographer.techfluxsolutions.com"
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



// // ✅ Explicit OPTIONS handling
// app.use((req, res, next) => {
//   if (req.method === "OPTIONS") {
//     return res.sendStatus(204);
//   }
//   next();
// });



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
