import jwt from "jsonwebtoken";
import { verifyToken } from "../Config/jwtConfig.mjs";
export const socketAuthMiddleware = (socket, next) => {
    const token = socket.handshake.auth.token;

    // DEBUG LOGS
    console.log("🔑 JWT_SECRET from env:", process.env.JWT_SECRET);
    console.log("📝 Token received:", token);

    // Try decoding without verification to see the payload
    const decoded = jwt.decode(token);
    console.log("📦 Decoded payload (unverified):", decoded);

    if (!token) {
        return next(new Error("No token provided"));
    }

    try {
        const verified = verifyToken(token);
        console.log("✅ Token verified successfully:", verified);
        socket.user = verified;
        next();
    } catch (error) {
        console.error("❌ Verification failed:", error.message);
        next(new Error("Invalid token"));
    }
};