import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import userRoutes from "./routes/userRoutes.mjs";
import adminRoutes from "./routes/adminRoute.mjs";
import photographerRoutes from "./routes/photographerRoutes.mjs";
import authRoutes from "./routes/authRoutes.mjs";
import enquiryRoutes from "./routes/enquiryRoutes.mjs";
import quoteRoutes from "./routes/quoteRoutes.mjs";
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
app.use("/enquiries", enquiryRoutes);
// Quotes
app.use("/quotes", quoteRoutes);
// Mount admin routes
app.use("/api/admins", adminRoutes);
// Mount photographer routes
app.use("/api/photographers", photographerRoutes);

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

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});

// Simple error handler
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res
    .status(err.status || 500)
    .json({ success: false, message: err.message || "Internal Server Error" });
});

export default app;
