import { signToken } from "../../utils/jwt.mjs";
import roleModelMap from "../../utils/roleModelMap.mjs";
import User from "../../models/User.mjs";
import axios from "axios";
const OTP_BYPASS_ENABLED = process.env.OTP_BYPASS_ENABLED === "true";
const OTP_BYPASS_NUMBERS = (process.env.OTP_BYPASS_NUMBERS || "")
  .split(",")
  .map((n) => n.trim())
  .filter(Boolean);
const OTP_BYPASS_CODE = process.env.OTP_BYPASS_CODE || "000000";

const OTP_VALIDITY_MINUTES = Number(process.env.OTP_VALIDITY_MINUTES) || 5;
const OTP_RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 30;
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS) || 5;
const OTP_LOCK_MINUTES = Number(process.env.OTP_LOCK_MINUTES) || 15;

const PROVIDER_MESSAGES = {
  200: { message: "Login successful.", status: 200 },

  400: { message: "Something went wrong. Please try again.", status: 400 },

  409: { message: "Request already submitted.", status: 409 },

  500: { message: "Server error. Please try again later.", status: 500 },

  501: { message: "Service unavailable. Please try again later.", status: 500 },

  505: { message: "Session expired. Please request a new OTP.", status: 400 },

  506: { message: "Please wait before requesting another OTP.", status: 429 },

  511: { message: "Invalid phone number.", status: 400 },

  700: { message: "Verification failed. Try again.", status: 400 },

  702: { message: "Incorrect OTP entered.", status: 400 },

  703: { message: "Phone number already verified.", status: 400 },

  705: { message: "OTP expired. Request a new one.", status: 400 },

  800: { message: "Too many attempts. Try again later.", status: 429 },
};


class AuthController {
  // Production Routes
  async sendOTP(req, res, next) {
    try {
      const { mobileNumber } = req.body;

      /* 1️⃣ Validate mobile */
      if (!mobileNumber) {
        return res.status(400).json({
          success: false,
          message: "Mobile number is required",
        });
      }

      const cleanedMobile = mobileNumber.toString().replace(/\D/g, "");
      if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Indian mobile number",
        });
      }

      /* 2️⃣ Validate MessageCentral config */
      const baseUrl = process.env.MESSAGE_CENTRAL_BASE_URL;
      const authToken = process.env.MESSAGE_CENTRAL_AUTH_TOKEN;
      const customerId = process.env.MESSAGE_CENTRAL_CUSTOMER_ID;

      if (!baseUrl || !authToken || !customerId) {
        console.error("❌ MessageCentral env missing", {
          baseUrl: !!baseUrl,
          authToken: !!authToken,
          customerId: !!customerId,
        });
        return res.status(500).json({
          success: false,
          message: "SMS service not configured",
        });
      }

      /* 3️⃣ Find or create user */
      let user = await User.findOne({ mobileNumber: cleanedMobile });
      if (!user) {
        user = await User.create({
          mobileNumber: cleanedMobile,
          userType: "user",
        });
      }

      /* 4️⃣ OTP Bypass */
      if (OTP_BYPASS_ENABLED && OTP_BYPASS_NUMBERS.includes(cleanedMobile)) {
        user.verificationId = "bypass_verification_id";

        user.verificationExpiry = new Date(
          Date.now() + OTP_VALIDITY_MINUTES * 60 * 1000
        );
        await user.save();

        return res.status(200).json({
          success: true,
          message: "OTP sent successfully (bypass)",
          bypass: true,
        });
      }

      /* Rate Limiting & Security Checks */
      if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
        const waitMinutes = Math.ceil(
          (new Date(user.lockUntil) - new Date()) / (60 * 1000)
        );
        return res.status(429).json({
          success: false,
          message: `Account locked due to too many failed attempts. Please try again in ${waitMinutes} minutes.`,
        });
      }

      if (
        user.lastOtpSentAt &&
        Date.now() - new Date(user.lastOtpSentAt).getTime() <
        OTP_RESEND_COOLDOWN_SECONDS * 1000
      ) {
        const waitSeconds = Math.ceil(
          (OTP_RESEND_COOLDOWN_SECONDS * 1000 -
            (Date.now() - new Date(user.lastOtpSentAt).getTime())) /
          1000
        );
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitSeconds} seconds before requesting a new OTP.`,
        });
      }

      /* 5️⃣ Send OTP via MessageCentral */
      const params = new URLSearchParams({
        customerId,
        countryCode: "91",
        flowType: "SMS",
        mobileNumber: cleanedMobile,
        timeout: "60",
      });

      const url = `${baseUrl}/verification/v3/send?${params.toString()}`;

      let response;
      try {
        response = await axios.post(url, null, {
          headers: {
            AuthToken: authToken,
            "Content-Type": "application/json",
          },
        });
        console.log("ress", response);
      } catch (err) {
        const providerData = err.response?.data;
        console.error(
          "❌ MessageCentral SEND failed:",
          providerData || err.message
        );

        return res.status(502).json({
          success: false,
          message:
            providerData?.message ||
            providerData?.errorMessage ||
            "Failed to send OTP",
          provider: providerData,
        });
      }

      /* 6️⃣ Validate provider response */
      const data = response.data;
      const verificationId =
        data?.verificationId || data?.data?.verificationId || data?.id || null;

      const responseCode = Number(
        data?.responseCode || data?.data?.responseCode
      );

      if (response.status !== 200 || responseCode !== 200 || !verificationId) {
        console.error("❌ Invalid SEND response:", data);
        const mappedError = PROVIDER_MESSAGES[responseCode] || {
          message: "Failed to send OTP",
          status: 502,
        };
        return res.status(mappedError.status).json({
          success: false,
          message: mappedError.message,
          provider: data,
        });
      }

      /* 7️⃣ Save verification details */
      user.verificationId = verificationId;
      user.verificationExpiry = new Date(
        Date.now() + OTP_VALIDITY_MINUTES * 60 * 1000
      );
      user.lastOtpSentAt = new Date();
      user.otpAttempts = 0; // Reset attempts on new OTP send
      // Ensure our canonical isVerified flag is false when sending OTP
      user.isVerified = false;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "OTP sent successfully",
      });
    } catch (error) {
      console.error("❌ Send OTP error:", error.message);
      return res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  //   /* =======================
  //    VERIFY OTP
  // ======================= */
  async verifyOTP(req, res) {
    try {
      const { mobileNumber, otp, fcmToken } = req.body;

      /* 1️⃣ Validate input */
      if (!mobileNumber) {
        return res.status(400).json({
          success: false,
          message: "Mobile number is required",
        });
      }

      if (!otp) {
        return res.status(400).json({
          success: false,
          message: "OTP is required",
        });
      }

      const cleanedMobile = mobileNumber.toString().replace(/\D/g, "");

      if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Indian mobile number",
        });
      }

      /* 2️⃣ Find user */
      const user = await User.findOne({ mobileNumber: cleanedMobile });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      /* 2.1️⃣ Check Lock Status */
      if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
        const waitMinutes = Math.ceil(
          (new Date(user.lockUntil) - new Date()) / (60 * 1000)
        );
        return res.status(429).json({
          success: false,
          message: `Account locked due to too many failed attempts. Please try again in ${waitMinutes} minutes.`,
        });
      }
      /* 3️⃣ OTP BYPASS (DEV / QA) */
      if (
        process.env.OTP_BYPASS_ENABLED === "true" &&
        process.env.OTP_BYPASS_NUMBERS?.split(",").includes(cleanedMobile) &&
        otp === process.env.OTP_BYPASS_CODE
      ) {
        user.isVerified = true;
        user.verificationId = null;
        user.verificationExpiry = null;

        if (fcmToken) user.fcmToken = fcmToken;

        const token = signToken({
          id: user._id,
          mobileNumber: user.mobileNumber,
          userType: user.userType,
          isAdmin: !!user.isAdmin,
        });

        user.token = token;
        await user.save();

        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
          success: true,
          message: "OTP verified successfully (bypass)",
          token,
          user,
        });
      }

      /* 4️⃣ Ensure OTP request exists */
      if (!user.verificationId) {
        return res.status(400).json({
          success: false,
          message: "No OTP request found. Please resend OTP.",
        });
      }

      /* 5️⃣ Expiry check */
      if (
        !user.verificationExpiry ||
        new Date() > new Date(user.verificationExpiry)
      ) {
        user.verificationId = null;
        user.verificationExpiry = null;
        await user.save();

        return res.status(400).json({
          success: false,
          message: "OTP expired. Please resend OTP.",
        });
      }

      /* 6️⃣ Validate MessageCentral config */
      const baseUrl = process.env.MESSAGE_CENTRAL_BASE_URL;
      const authToken = process.env.MESSAGE_CENTRAL_AUTH_TOKEN;
      const customerId = process.env.MESSAGE_CENTRAL_CUSTOMER_ID;

      if (!baseUrl || !authToken || !customerId) {
        console.error("❌ MessageCentral not configured properly");
        return res.status(500).json({
          success: false,
          message: "SMS service not configured",
        });
      }

      /* 7️⃣ VERIFY OTP */
      const verifyUrl = `${baseUrl}/verification/v3/validateOtp?customerId=${customerId}&verificationId=${user.verificationId}&code=${otp}`;

      let response;

      try {
        response = await axios.get(verifyUrl, {
          headers: { authToken },
          timeout: 10000,
        });
      } catch (err) {
        console.error("❌ MessageCentral VERIFY error:");

        // 🔹 Timeout
        if (err.code === "ECONNABORTED") {
          return res.status(503).json({
            success: false,
            message: "OTP verification service timeout. Please try again.",
          });
        }

        // 🔹 Network / DNS error
        if (!err.response) {
          return res.status(503).json({
            success: false,
            message:
              "Unable to reach OTP verification service. Please try again later.",
          });
        }

        // 🔹 Provider responded with error
        const providerData = err.response?.data || {};
        const providerCode =
          providerData?.responseCode ||
          providerData?.data?.responseCode ||
          err.response?.status;

        console.error("Provider Status:", err.response?.status);
        console.error("Provider Response:", providerData);

        const mappedError = PROVIDER_MESSAGES[providerCode] || {
          message: "Invalid or expired OTP",
          status: 400,
        };

        return res.status(mappedError.status).json({
          success: false,
          message: mappedError.message,
          providerCode,
        });
      }

      /* 8️⃣ Validate provider success response */
      const data = response?.data || {};

      const providerCode = Number(
        data?.responseCode ||
        data?.data?.responseCode ||
        0
      );

      if (response.status !== 200 || providerCode !== 200) {
        // Handle specific failure cases
        if (providerCode === 702) {
          // WRONG_OTP_PROVIDED
          user.otpAttempts = (user.otpAttempts || 0) + 1;
          if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
            user.lockUntil = new Date(
              Date.now() + OTP_LOCK_MINUTES * 60 * 1000
            );
            user.otpAttempts = 0; // Reset attempts after locking
            await user.save();
            return res.status(403).json({
              success: false,
              message: `Maximum verification attempts exceeded. Account locked for ${OTP_LOCK_MINUTES} minutes.`,
              code: "ACCOUNT_LOCKED",
            });
          }
          await user.save();
          return res.status(400).json({
            success: false,
            message: `Wrong OTP entered. You have ${OTP_MAX_ATTEMPTS - user.otpAttempts
              } attempts remaining.`,
            providerCode,
          });
        }

        const mappedError = PROVIDER_MESSAGES[providerCode] || {
          message: "Invalid or expired OTP",
          status: 400,
        };

        return res.status(mappedError.status).json({
          success: false,
          message: mappedError.message,
          providerCode,
        });
      }

      /* 9️⃣ SUCCESS — finalize login */
      user.isVerified = true;
      user.verificationId = null;
      user.verificationExpiry = null;
      user.otpAttempts = 0;
      user.lockUntil = null;

      if (fcmToken) user.fcmToken = fcmToken;

      const token = signToken({
        id: user._id,
        mobileNumber: user.mobileNumber,
        userType: user.userType,
        isAdmin: !!user.isAdmin,
      });

      user.token = token;
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
        token,
        user,
      });

    } catch (error) {
      console.error("❌ verifyOTP internal error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }


  // Developement Routes

  // async sendOTP(req, res, next) {
  //   try {
  //     const { mobileNumber, role } = req.body;
  //     /* 1️⃣ Validate mobile */
  //     if (!mobileNumber) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Mobile number is required",
  //       });
  //     }
  //     if (!roleModelMap[role]) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Invalid role",
  //       });
  //     }

  //     const cleanedMobile = mobileNumber.toString().replace(/\D/g, "");
  //     if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Invalid Indian mobile number",
  //       });
  //     }

  //     const Model = roleModelMap[role];

  //     const alreadyExistedUser = await Model.findOne({
  //       mobileNumber: cleanedMobile,
  //     });
  //     if (alreadyExistedUser) {
  //       return res.status(200).json({
  //         success: true,
  //         message: "YOUR OTP IS 1234",
  //       })
  //     }

  //     const newUserData ={
  //       mobileNumber: cleanedMobile,
  //       userType: "user",
  //       verificationId: "1234",
  //     };
  //     const user = await Model.create(newUserData);
  //     console.log(user);
  //     if (user) {
  //       return res.status(200).json({
  //         success: true,
  //         message: "YOUR OTP IS 1234",
  //       });
  //     }
  //     res.status(400).json({
  //       success: false,
  //       message: "Failed to send OTP",
  //     });
  //   } catch (error) {
  //     console.error("❌ Send OTP error:", error.message);
  //     return res.status(500).json({
  //       success: false,
  //       message: error.message || "Internal server error",
  //     });
  //   }
  // }


  //static 1234 OTP And Verify Code

  // async sendOTP(req, res, next) {
  //   try {
  //     const { mobileNumber, role } = req.body;
  //     /* 1️⃣ Validate mobile */
  //     if (!mobileNumber) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Mobile number is required",
  //       });
  //     }
  //     if (!roleModelMap[role]) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Invalid role",
  //       });
  //     }

  //     const cleanedMobile = mobileNumber.toString().replace(/\D/g, "");
  //     if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Invalid Indian mobile number",
  //       });
  //     }

  //     const Model = roleModelMap[role];

  //     const alreadyExistedUser = await Model.findOne({
  //       mobileNumber: cleanedMobile,
  //     });
  //     if (alreadyExistedUser) {
  //       return res.status(200).json({
  //         success: true,
  //         message: "YOUR OTP IS 1234",
  //       })
  //     }

  //     const newUserData = {
  //       mobileNumber: cleanedMobile,
  //       userType: "user",
  //       verificationId: "1234",
  //     };
  //     const user = await Model.create(newUserData);
  //     console.log(user);
  //     if (user) {
  //       return res.status(200).json({
  //         success: true,
  //         message: "YOUR OTP IS 1234",
  //       });
  //     }
  //     res.status(400).json({
  //       success: false,
  //       message: "Failed to send OTP",
  //     });
  //   } catch (error) {
  //     console.error("❌ Send OTP error:", error.message);
  //     return res.status(500).json({
  //       success: false,
  //       message: error.message || "Internal server error",
  //     });
  //   }
  // }

  /* =======================
   VERIFY OTP
======================= */
  // async verifyOTP(req, res) {
  //   try {
  //     const { mobileNumber, otp, role } = req.body;


  //     /* 1️⃣ Validate input */
  //     if (!mobileNumber || !otp) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Mobile number and OTP are required",
  //       });
  //     }

  //     const cleanedMobile = mobileNumber.toString().replace(/\D/g, "");
  //     if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Invalid Indian mobile number",
  //       });
  //     }
  //     console.log(cleanedMobile, otp, role);

  //     const Model = roleModelMap[role];
  //     /* 2️⃣ Find user */
  //     const user = await Model.findOne({
  //       mobileNumber: cleanedMobile,
  //     });
  //     if (!user) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "User not found",
  //       });
  //     }

  //     if (otp === "1234") {
  //       const token = signToken({
  //         id: user._id,
  //         mobileNumber: user.mobileNumber,
  //         userType: user.userType,
  //       });
  //       await user.save();
  //       console.log("token Created", token);
  //       return res.status(200).json({
  //         success: true,
  //         message: "OTP verified successfully",
  //         token: token,
  //         id: user._id,
  //       });
  //     } else {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Invalid OTP",
  //       });
  //     }
  //   } catch (error) {
  //     return res.status(500).json({
  //       success: false,
  //       message: error.message || "Internal server error",
  //     });
  //   }
  // }


  //static 1234 OTP And Verify Code Ends
}
export default new AuthController();
