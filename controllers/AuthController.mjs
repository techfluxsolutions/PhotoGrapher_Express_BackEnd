import bcrypt from "bcrypt";
import User from "../models/User.mjs";
import Photographer from "../models/Photographer.mjs";
import Admin from "../models/Admin.mjs";
import { signToken } from "../utils/jwt.mjs";
import {
  sendSuccessResponse,
  sendErrorResponse,
} from "../utils/handleResponce.mjs";
// Simple in-memory OTP store: mobile -> { otp, expiresAt }
import client from "../Config/twilio/twilio.config.mjs";
class AuthController {
  // async registerCustomer(req, res, next) {
  //   try {
  //     const { name, email, password, avtar } = req.body;
  //     if (!email || !password) {
  //       return sendErrorResponse(res, 400, "All fields are required");
  //     }
  //     const newUser = User.create({ name, email, password, avtar });
  //     if (!newUser) {
  //       sendErrorResponse(res, 404, "failed to register");
  //     }
  //     return sendSuccessResponse(res, newUser, "Registered");
  //   } catch (err) {
  //     return next(err);
  //   }
  // }

  async loginPhotographer(req, res, next) {
    try {
      const { username, password } = req.body;
      const photographer = await Photographer.findOne({ username });
      if (!photographer)
        return res
          .status(401)
          .json({ success: false, error: "Invalid credentials" });
      const match = await bcrypt.compare(password, photographer.password);
      if (!match)
        return res
          .status(401)
          .json({ success: false, error: "Invalid credentials" });
      const token = signToken({ id: photographer._id, role: "photographer" });
      return res.json({ success: true, data: { token, photographer } });
    } catch (err) {
      return next(err);
    }
  }

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
  async sendOTP(req, res) {
    try {
      const { mobile } = req.body;

      if (!mobile) {
        return res.status(400).json({ message: "Mobile number is required" });
      }

      const ONE_HOUR = 60 * 60 * 1000;
      const now = Date.now();

      let user = await User.findOne({ mobileNo: mobile });

      // ✅ If user exists and OTP is still valid → do not resend
      if (user && user.otp && user.otpExpiresAt > now) {
        return res.status(200).json({
          message: "OTP already sent and still valid",
          expiresAt: user.otpExpiresAt,
        });
      }

      // 🔐 Generate new OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = now + ONE_HOUR;

      if (user) {
        // 🔁 Update existing user OTP
        user.otp = otp;
        user.otpExpiresAt = otpExpiresAt;
        await user.save();
      } else {
        // 🆕 Create new user
        user = await User.create({
          mobileNo: mobile,
          otp,
          otpExpiresAt,
        });
      }
      //send OTP via Twilio
      await client.messages.create({
        body: `Your OTP code is ${otp} , this OTP is valid for an hour`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: mobile,
      });
      return res.status(200).json({
        message: "OTP sent successfully",
        mobile,
        expiresAt: otpExpiresAt,
      });
    } catch (error) {
      console.error("Send OTP Error:", error);
      return res.status(500).json({
        message: "Failed to send OTP",
      });
    }
  }

  async verifyOTP(req, res) {
    try {
      const { otp } = req.body;

      if (!otp) {
        return res.status(400).json({ message: "OTP is required" });
      }

      const user = await User.findOne({ otp });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.otp !== otp || user.otpExpiresAt < Date.now()) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      }

      // OTP verified
      user.otp = null;
      user.otpExpiresAt = null;
      user.isVerified = true;
      await user.save();

      const token = signToken({ id: user._id, role: "customer" });

      // ✅ Save token in HTTP-only cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // true in prod
        sameSite: "strict", // or "lax" if frontend & backend are on different domains
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(200).json({
        message: "Mobile number verified successfully",
        user,
      });
    } catch (error) {
      sendErrorResponse(res, 500, "Failed to verify OTP");
    }
  }
}
export default new AuthController();
