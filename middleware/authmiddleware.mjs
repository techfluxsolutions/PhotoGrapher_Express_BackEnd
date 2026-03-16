import { verifyToken } from "../utils/jwt.mjs";

export default function authMiddleware(req, res, next) {
  console.log("Auth Middleware Hit:", req.originalUrl);

  let token;

  // ✅ Get token from Authorization header OR query string
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, token missing",
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // attach decoded user
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}
