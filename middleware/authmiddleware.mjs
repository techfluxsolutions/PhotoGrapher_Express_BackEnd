import { verifyToken } from "../utils/jwt.mjs";

export default function authMiddleware(req, res, next) {
  console.log("Auth Middleware Hit:", req.originalUrl);
  let token;
  // 1) Check if token exists in headers or cookies
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Not authorized, token missing" });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // attach decoded user to request
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}
