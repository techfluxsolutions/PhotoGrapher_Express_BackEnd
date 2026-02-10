import PhotographerDB from "../../models/Photographer.mjs";
import { signToken } from "../../utils/jwt.mjs";
import bcrypt from "bcrypt";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../utils/handleResponce.mjs"; // Note: file name has typo 'Responce'

class PhotographerAuthController {
  // Login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return sendErrorResponse(res, "Email and password are required", 400);
      }

      // Find photographer by email
      // Note: Check if the user is a photographer? The model has isPhotographer: true default.
      const photographer = await PhotographerDB.findOne({ email });

      if (!photographer) {
        return sendErrorResponse(res, "Invalid email or password", 401);
      }

      // Password Check (Support both hashed and legacy plain text if needed, but primarily hashed)
      const isMatch = await bcrypt.compare(password, photographer.password);

      if (!isMatch) {
        // Fallback for plain text (if any exist during transition) - Optional
        if (photographer.password !== password) {
          return sendErrorResponse(res, "Invalid email or password", 401);
        }
      }

      // Generate Token
      const token = signToken({
        id: photographer._id,
        email: photographer.email,
        userType: "photographer",
        isPhotographer: true,
      });

      const photographerData = {
        id: photographer._id,
        username: photographer.username,
        email: photographer.email,
        mobileNumber: photographer.mobileNumber,
        status: photographer.status,
      };

      // Set cookie (optional but good practice)
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return sendSuccessResponse(
        res,
        { token, photographer: photographerData },
        "Login successful",
        200
      );
    } catch (error) {
      console.error("Photographer login error:", error);
      return sendErrorResponse(res, error.message, 500);
    }
  }

  // Forgot Password
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return sendErrorResponse(res, "Email is required", 400);
      }

      const photographer = await PhotographerDB.findOne({ email });
      if (!photographer) {
        // Security: Don't reveal if email exists, but for now we can be explicit or generic
        return sendErrorResponse(res, "User with this email does not exist", 404);
      }

      // Generate a simple random token
      const resetToken = Math.random().toString(36).substring(2, 15);
      photographer.resetPasswordToken = resetToken;
      photographer.resetPasswordExpires = Date.now() + 3600000; // 1 hour

      await photographer.save();

      // MOCK Email Sending
      // In a real app, send an email here.
      // For now, return the token in the response so the user can use it.

      console.log(`[MOCK EMAIL] Password reset token for ${email}: ${resetToken}`);

      return sendSuccessResponse(
        res,
        { resetToken }, // Returning token for testing purposes
        "Password reset token generated (mock email sent)",
        200
      );

    } catch (error) {
      console.error("Forgot password error:", error);
      return sendErrorResponse(res, error.message, 500);
    }
  }

  // Reset Password
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return sendErrorResponse(res, "Token and new password are required", 400);
      }

      const photographer = await PhotographerDB.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!photographer) {
        return sendErrorResponse(res, "Invalid or expired token", 400);
      }

      // Set new password (plain text as requested)
      photographer.password = newPassword;
      photographer.resetPasswordToken = undefined;
      photographer.resetPasswordExpires = undefined;

      await photographer.save();

      return sendSuccessResponse(res, null, "Password reset successful", 200);

    } catch (error) {
      console.error("Reset password error:", error);
      return sendErrorResponse(res, error.message, 500);
    }
  }
}

export default new PhotographerAuthController();
