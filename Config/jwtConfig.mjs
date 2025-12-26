import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET || "your_secret_key";
const EXPIRES_IN = "1d"; // token expiration

function generateToken(payload) {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET_KEY);
}

export { generateToken, verifyToken };
