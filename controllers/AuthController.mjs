import bcrypt from "bcrypt";
import User from "../models/User.mjs";
import Photographer from "../models/Photographer.mjs";
import Admin from "../models/Admin.mjs";
import { signToken } from "../utils/jwt.mjs";
// Simple in-memory OTP store: mobile -> { otp, expiresAt }
import client from "../Config/twilio/twilio.config.mjs";
class AuthController {
  async adminLogin(req, res, next) {
    try {
      const { username, password } = req.body;
      const admin = await Admin.findOne({ username });
      if (!admin)
        return res
          .status(401)
          .json({ success: false, error: "Invalid credentials" });
      const match = await bcrypt.compare(password, admin.password);
      if (!match)
        return res
          .status(401)
          .json({ success: false, error: "Invalid credentials" });
      const token = signToken({ id: admin._id, role: "admin" });
      return res.json({ success: true, data: { token, admin } });
    } catch (err) {
      return next(err);
    }
  }
  async sendOTP(mobileNumber) {
    try {
      // Clean mobile number
      const cleanedMobile = mobileNumber.toString().replace(/\D/g, "");

      // Check if any user exists with this mobile
      let user = await User.findOne({ mobileNumber: cleanedMobile });

      if (!user) {
        // Create new admin user
        user = await User.create({
          mobileNumber: cleanedMobile,
          userType: "customer",
          isAdmin: true,
          isVerified: false,
        });
      } else if (!user.isAdmin) {
        // Update existing user to admin - ensure userType is set
        user.isAdmin = true;
        if (!user.userType) {
          user.userType = "customer";
        }
        await user.save();
        console.log(`✅ Existing user promoted to admin: ${cleanedMobile}`);
      }

      // ✅ Check if this is a bypass number - skip SMS sending
      if (OTP_BYPASS_ENABLED && OTP_BYPASS_NUMBERS.includes(cleanedMobile)) {
        console.warn(
          `⚠️ Bypass number detected (ADMIN): ${cleanedMobile} - Skipping SMS`
        );

        // Set fake verification ID for bypass
        user.verificationId = "bypass_verification_id";
        user.verificationExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        return {
          success: true,
          message: "OTP sent successfully to admin (bypass mode)",
          bypass: true,
        };
      }

      // Normal flow - send OTP via SMS controller
      const mockReq = {
        body: { mobileNumber: cleanedMobile },
      };

      let otpResult;
      const mockRes = {
        status: (code) => ({
          json: (data) => {
            otpResult = { statusCode: code, ...data };
          },
        }),
      };

      await smsController.sendOtp(mockReq, mockRes);

      if (otpResult && otpResult.statusCode === 200) {
        return {
          success: true,
          message: "OTP sent successfully to admin mobile number",
        };
      }

      throw new Error("Failed to send OTP");
    } catch (error) {
      console.error("Error sending admin OTP:", error);
      throw new Error(error.message || "Failed to send OTP");
    }
  }

  /**
   * Verify OTP and generate JWT token for admin
   */
  async verifyOTP(mobileNumber, otp, fcmToken) {
    try {
      // Clean mobile number
      const cleanedMobile = mobileNumber.toString().replace(/\D/g, "");

      // ✅ Bypass check
      if (
        OTP_BYPASS_ENABLED &&
        OTP_BYPASS_NUMBERS.includes(cleanedMobile) &&
        otp === OTP_BYPASS_CODE
      ) {
        console.warn(`⚠️ OTP Bypass used for ADMIN: ${cleanedMobile}`);

        let user = await User.findOne({ mobileNumber: cleanedMobile });

        if (!user || !user.isAdmin) {
          throw new Error("Admin user not found or not authorized");
        }

        user.isVerified = true;
        if (fcmToken) {
          user.fcmToken = fcmToken;
        }
        user.verificationId = null;
        user.verificationExpiry = null;
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
          {
            id: user._id,
            mobileNumber: user.mobileNumber,
            userType: user.userType,
            isAdmin: user.isAdmin,
          },
          process.env.JWT_SECRET,
          { expiresIn: "30d" }
        );

        user.token = token;
        await user.save();

        return {
          success: true,
          message: "Admin OTP verified successfully (bypass)",
          bypass: true,
          token,
          user: {
            id: user._id,
            mobileNumber: user.mobileNumber,
            userType: user.userType,
            isAdmin: user.isAdmin,
            isVerified: user.isVerified,
          },
        };
      }

      // Normal verification flow
      const verifyResult = await smsController.verifyOtp(
        cleanedMobile,
        otp,
        fcmToken
      );

      // Find user and verify admin status
      let user = await User.findOne({ mobileNumber: cleanedMobile });

      if (!user || !user.isAdmin) {
        throw new Error("Admin user not found or not authorized");
      }

      user.isVerified = true;
      if (fcmToken) {
        user.fcmToken = fcmToken;
      }
      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user._id,
          mobileNumber: user.mobileNumber,
          userType: user.userType,
          isAdmin: user.isAdmin,
        },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
      );

      user.token = token;
      await user.save();

      return {
        success: true,
        message: "Admin OTP verified successfully",
        token,
        user: {
          id: user._id,
          mobileNumber: user.mobileNumber,
          userType: user.userType,
          isAdmin: user.isAdmin,
          isVerified: user.isVerified,
        },
      };
    } catch (error) {
      console.error("Error verifying admin OTP:", error);
      throw new Error(error.message || "OTP verification failed");
    }
  }
}
export default new AuthController();
