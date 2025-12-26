import { verifyToken } from "../Config/jwtConfig.mjs";

export default function authMiddleware(req, res, next) {
  // ✅ Read token from cookies
  const token = req.cookies?.token;

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
