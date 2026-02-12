import AdminEmailAuthDB from "../../models/AdminEmailAuth.mjs";
import { signToken } from "../../utils/jwt.mjs";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../utils/handleResponce.mjs";

// Hardcoded admin credentials
const ADMIN_EMAIL = "admin@techflux.in";
const ADMIN_PASSWORD = "12345";

class AdminEmailAuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Validate that both fields are provided
      if (!email || !password) {
        return sendErrorResponse(
          res,
          "Email and password are required",
          400
        );
      }

      // Check if email matches the hardcoded admin email
      if (email.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase()) {
        return res.json({
          success: false,
          message: "Invalid email or password",
        })
      }

      // Check if password matches the hardcoded password
      if (password !== ADMIN_PASSWORD) {
        return res.json({
          success: false,
          message: "Invalid email or password",
        })
      }

      // Find or create the admin record in the database
      let admin = await AdminEmailAuthDB.findOne({ email: ADMIN_EMAIL });

      if (!admin) {
        // Create the admin record if it doesn't exist
        admin = await AdminEmailAuthDB.create({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          isActive: true,
        });
      }

      // Update last login timestamp
      admin.lastLogin = new Date();
      await admin.save();

      // Generate JWT token
      const token = signToken({
        id: admin._id,
        email: admin.email,
        userType: "admin",
        isAdmin: true,
      });

      // Prepare admin data for response
      const adminData = {
        id: admin._id,
        email: admin.email,
        isActive: admin.isActive,
        lastLogin: admin.lastLogin,
      };

      // Set token in cookie (optional, matching existing auth pattern)
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return sendSuccessResponse(
        res,
        { token, admin: adminData },
        "Login successful",
        200
      );
    } catch (err) {
      console.error("❌ Admin email login error:", err.message);
      return sendErrorResponse(res, err.message, 500);
    }
  }
}

export default new AdminEmailAuthController();
