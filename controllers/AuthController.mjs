import User from "../models/User.mjs";
import { signToken } from "../utils/jwt.mjs";
import roleModelMap from "../utils/roleModelMap.mjs";

const OTP_BYPASS_ENABLED = process.env.OTP_BYPASS_ENABLED === "true";
const OTP_BYPASS_NUMBERS = (process.env.OTP_BYPASS_NUMBERS || "")
  .split(",")
  .map((n) => n.trim())
  .filter(Boolean);
const OTP_BYPASS_CODE = process.env.OTP_BYPASS_CODE || "000000";

const OTP_EXPIRY_MS = 60 * 1000; // 1 minute

class AuthController {
  // Production Routes
  //   async sendOTP(req, res, next) {
  //     try {
  //       const { mobileNumber } = req.body;

  //       /* 1️⃣ Validate mobile */
  //       if (!mobileNumber) {
  //         return res.status(400).json({
  //           success: false,
  //           message: "Mobile number is required",
  //         });
  //       }

  //       const cleanedMobile = mobileNumber.toString().replace(/\D/g, "");
  //       if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
  //         return res.status(400).json({
  //           success: false,
  //           message: "Invalid Indian mobile number",
  //         });
  //       }

  //       /* 2️⃣ Validate MessageCentral config */
  //       const baseUrl = process.env.MESSAGE_CENTRAL_BASE_URL;
  //       const authToken = process.env.MESSAGE_CENTRAL_AUTH_TOKEN;
  //       const customerId = process.env.MESSAGE_CENTRAL_CUSTOMER_ID;

  //       if (!baseUrl || !authToken || !customerId) {
  //         console.error("❌ MessageCentral env missing", {
  //           baseUrl: !!baseUrl,
  //           authToken: !!authToken,
  //           customerId: !!customerId,
  //         });
  //         return res.status(500).json({
  //           success: false,
  //           message: "SMS service not configured",
  //         });
  //       }

  //       /* 3️⃣ Find or create user */
  //       let user = await User.findOne({ mobileNumber: cleanedMobile });
  //       if (!user) {
  //         user = await User.create({
  //           mobileNumber: cleanedMobile,
  //           userType: "user",
  //         });
  //       }

  //       /* 4️⃣ OTP Bypass */
  //       if (OTP_BYPASS_ENABLED && OTP_BYPASS_NUMBERS.includes(cleanedMobile)) {
  //         user.verificationId = "bypass_verification_id";
  //         user.verificationExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
  //         await user.save();

  //         return res.status(200).json({
  //           success: true,
  //           message: "OTP sent successfully (bypass)",
  //           bypass: true,
  //         });
  //       }

  //       /* 5️⃣ Send OTP via MessageCentral */
  //       const params = new URLSearchParams({
  //         customerId,
  //         countryCode: "91",
  //         flowType: "SMS",
  //         mobileNumber: cleanedMobile,
  //         timeout: "60",
  //       });

  //       const url = `${baseUrl}/verification/v3/send?${params.toString()}`;

  //       let response;
  //       try {
  //         response = await axios.post(url, null, {
  //           headers: {
  //             AuthToken: authToken,
  //             "Content-Type": "application/json",
  //           },
  //         });
  //         console.log("ress", response);
  //       } catch (err) {
  //         const providerData = err.response?.data;
  //         console.error(
  //           "❌ MessageCentral SEND failed:",
  //           providerData || err.message
  //         );

  //         return res.status(502).json({
  //           success: false,
  //           message:
  //             providerData?.message ||
  //             providerData?.errorMessage ||
  //             "Failed to send OTP",
  //           provider: providerData,
  //         });
  //       }

  //       /* 6️⃣ Validate provider response */
  //       const data = response.data;
  //       const verificationId =
  //         data?.verificationId || data?.data?.verificationId || data?.id || null;

  //       const responseCode = Number(
  //         data?.responseCode || data?.data?.responseCode
  //       );

  //       if (response.status !== 200 || responseCode !== 200 || !verificationId) {
  //         console.error("❌ Invalid SEND response:", data);
  //         return res.status(502).json({
  //           success: false,
  //           message: "Failed to send OTP",
  //           provider: data,
  //         });
  //       }

  //       /* 7️⃣ Save verification details */
  //       user.verificationId = verificationId;
  //       user.verificationExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
  //       // Ensure our canonical isVerified flag is false when sending OTP
  //       user.isVerified = false;
  //       await user.save();

  //       return res.status(200).json({
  //         success: true,
  //         message: "OTP sent successfully",
  //       });
  //     } catch (error) {
  //       console.error("❌ Send OTP error:", error.message);
  //       return res
  //         .status(500)
  //         .json({ success: false, message: "Internal server error" });
  //     }
  //   }

  //   /* =======================
  //    VERIFY OTP
  // ======================= */
  //   async verifyOTP(req, res) {
  //     try {
  //       const { mobileNumber, otp, fcmToken } = req.body;

  //       /* 1️⃣ Validate input */
  //       if (!mobileNumber || !otp) {
  //         return res.status(400).json({
  //           success: false,
  //           message: "Mobile number and OTP are required",
  //         });
  //       }

  //       const cleanedMobile = mobileNumber.toString().replace(/\D/g, "");
  //       if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
  //         return res.status(400).json({
  //           success: false,
  //           message: "Invalid Indian mobile number",
  //         });
  //       }

  //       /* 2️⃣ Find user */
  //       const user = await User.findOne({ mobileNumber: cleanedMobile });
  //       if (!user) {
  //         return res.status(404).json({
  //           success: false,
  //           message: "User not found",
  //         });
  //       }

  //       /* 3️⃣ OTP BYPASS (DEV / QA) */
  //       if (
  //         OTP_BYPASS_ENABLED &&
  //         OTP_BYPASS_NUMBERS.includes(cleanedMobile) &&
  //         otp === OTP_BYPASS_CODE
  //       ) {
  //         user.isVerified = true;
  //         user.verificationId = null;
  //         user.verificationExpiry = null;
  //         if (fcmToken) user.fcmToken = fcmToken;

  //         const token = signToken({
  //           id: user._id,
  //           mobileNumber: user.mobileNumber,
  //           userType: user.userType,
  //         });

  //         user.token = token;
  //         await user.save();

  //         res.cookie("token", token, {
  //           httpOnly: true,
  //           secure: process.env.NODE_ENV === "production",
  //           sameSite: "strict",
  //           maxAge: 7 * 24 * 60 * 60 * 1000,
  //         });

  //         return res.status(200).json({
  //           success: true,
  //           message: "OTP verified successfully (bypass)",
  //           token,
  //           user,
  //         });
  //       }

  //       /* 4️⃣ Ensure OTP request exists */
  //       if (!user.verificationId) {
  //         return res.status(400).json({
  //           success: false,
  //           message: "No OTP request found. Please resend OTP.",
  //         });
  //       }

  //       /* 5️⃣ Expiry check */
  //       if (
  //         !user.verificationExpiry ||
  //         new Date() > new Date(user.verificationExpiry)
  //       ) {
  //         user.verificationId = null;
  //         user.verificationExpiry = null;
  //         await user.save();

  //         return res.status(400).json({
  //           success: false,
  //           message: "OTP expired. Please resend OTP.",
  //         });
  //       }

  //       /* 6️⃣ Validate MessageCentral config */
  //       const baseUrl = process.env.MESSAGE_CENTRAL_BASE_URL;
  //       const authToken = process.env.MESSAGE_CENTRAL_AUTH_TOKEN;
  //       const customerId = process.env.MESSAGE_CENTRAL_CUSTOMER_ID;

  //       if (!baseUrl || !authToken || !customerId) {
  //         return res.status(500).json({
  //           success: false,
  //           message: "SMS service not configured",
  //         });
  //       }

  //       /* 7️⃣ VERIFY OTP (AuthToken in QUERY PARAM — IMPORTANT) */
  //       const verifyUrl = `${baseUrl}/verification/v3/validateOtp?customerId=${customerId}&verificationId=${user.verificationId}&code=${otp}`;

  //       let response;
  //       try {
  //         response = await axios.get(verifyUrl, {
  //           headers: { authToken },
  //           timeout: 10000,
  //         });
  //       } catch (err) {
  //         console.error("❌ MessageCentral VERIFY error:", err);
  //         return res.status(400).json({
  //           success: false,
  //           message: err.response?.data?.message || "Invalid OTP",
  //           provider: err.response?.data,
  //         });
  //       }

  //       /* 8️⃣ Validate provider response */
  //       const data = response.data;
  //       const responseCode = Number(
  //         data?.responseCode || data?.data?.responseCode || 0
  //       );

  //       if (response.status !== 200 || responseCode !== 200) {
  //         return res.status(400).json({
  //           success: false,
  //           message: data?.message || "Invalid OTP",
  //           provider: data,
  //         });
  //       }

  //       /* 9️⃣ SUCCESS — finalize login */
  //       user.isVerified = true;
  //       user.verificationId = null;
  //       user.verificationExpiry = null;
  //       if (fcmToken) user.fcmToken = fcmToken;

  //       const token = signToken({
  //         id: user._id,
  //         mobileNumber: user.mobileNumber,
  //         userType: user.userType,
  //         isAdmin: !!user.isAdmin,
  //       });

  //       user.token = token;
  //       await user.save();

  //       res.cookie("token", token, {
  //         httpOnly: true,
  //         secure: process.env.NODE_ENV === "production",
  //         sameSite: "strict",
  //         maxAge: 7 * 24 * 60 * 60 * 1000,
  //       });

  //       return res.status(200).json({
  //         success: true,
  //         message: "OTP verified successfully",
  //         token,
  //         user,
  //       });
  //     } catch (error) {
  //       return res.status(500).json({
  //         success: false,
  //         message: "Internal server error",
  //       });
  //     }
  //   }

  // Developement Routes

  async sendOTP(req, res, next) {
    try {
      const { mobileNumber , role} = req.body;

      /* 1️⃣ Validate mobile */
      if (!mobileNumber) {
        return res.status(400).json({
          success: false,
          message: "Mobile number is required",
        });
      }
      if (!roleModelMap[role]) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

      const cleanedMobile = mobileNumber.toString().replace(/\D/g, "");
      if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Indian mobile number",
        });
      }

       const Model = roleModelMap[role];

      const alreadyExistedUser = await Model.findOne({
        mobileNumber: cleanedMobile,
      });
      if (alreadyExistedUser) {
        return res.status(400).json({
          success: false,
          message: "Use OTP 123456",
        });
      }
      const user = await Model.create({
        mobileNumber: cleanedMobile,
        userType: "user",
        verificationId: "1234",
      });
      if (user) {
        return res.status(200).json({
          success: true,
          message: "YOUR OTP IS 1234",
        });
      }
      res.status(400).json({
        success: false,
        message: "Failed to send OTP",
      });
    } catch (error) {
      console.error("❌ Send OTP error:", error.message);
      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  /* =======================
   VERIFY OTP
======================= */
  async verifyOTP(req, res) {
    try {
      const { mobileNumber, otp } = req.body;

      /* 1️⃣ Validate input */
      if (!mobileNumber || !otp) {
        return res.status(400).json({
          success: false,
          message: "Mobile number and OTP are required",
        });
      }

      const cleanedMobile = mobileNumber.toString().replace(/\D/g, "");
      if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Indian mobile number",
        });
      }
      console.log(cleanedMobile, otp);
      /* 2️⃣ Find user */
      const user = await User.findOne({
        mobileNumber: cleanedMobile,
      });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (otp === "1234") {
        const token = signToken({
          id: user._id,
          mobileNumber: user.mobileNumber,
          userType: user.userType,
        });
        await user.save();

        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
          success: true,
          message: "OTP verified successfully",
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP",
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}
export default new AuthController();
