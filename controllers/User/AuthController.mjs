import { signToken } from "../../utils/jwt.mjs";
import roleModelMap from "../../utils/roleModelMap.mjs";
import User from "../../models/User.mjs";
import Notification from "../../models/Notification.mjs";
// import axios from "axios";
import { verifyToken } from "../../utils/jwt.mjs";
import { sendMessageCentral, verifyMessageCentral } from "../../utils/messageCentral.mjs";
import { emitNotificationCount } from "../../services/SocketService.mjs";
import admin from "../../utils/firebaseAdmin.mjs";
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

  //     const cleanedMobile = mobileNumber.toString().replace(/\D/g, "");
  //     if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Invalid Indian mobile number",
  //       });
  //     }

  //     /* 3️⃣ Find or create user */
  //     const Model = roleModelMap[role] || User;
  //     let user = await Model.findOne({ mobileNumber: cleanedMobile });

  //     if (!user) {
  //       if (role === "photographer") {
  //         return res.status(404).json({
  //           success: false,
  //           message: "Please contact admin",
  //         });
  //       } else {
  //         user = await Model.create({
  //           mobileNumber: cleanedMobile,
  //           userType: role || "user",
  //         });
  //       }
  //     }

  //     // Check Photographer Activation Status
  //     if (role === "photographer" && user.status !== "active") {
  //       return res.status(403).json({
  //         success: false,
  //         message: "Your account is unverified. Please contact the admin.",
  //       });
  //     }

  //     /* 4️⃣ OTP Bypass */
  //     if (OTP_BYPASS_ENABLED && OTP_BYPASS_NUMBERS.includes(cleanedMobile)) {
  //       user.verificationId = "bypass_verification_id";

  //       user.verificationExpiry = new Date(
  //         Date.now() + OTP_VALIDITY_MINUTES * 60 * 1000
  //       );
  //       await user.save();

  //       return res.status(200).json({
  //         success: true,
  //         message: "OTP sent successfully (bypass)",
  //         bypass: true,
  //       });
  //     }

  //     /* Rate Limiting & Security Checks */
  //     if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
  //       const waitMinutes = Math.ceil(
  //         (new Date(user.lockUntil) - new Date()) / (60 * 1000)
  //       );
  //       return res.status(429).json({
  //         success: false,
  //         message: `Account locked due to too many failed attempts. Please try again in ${waitMinutes} minutes.`,
  //       });
  //     }



  //     if (
  //       user.lastOtpSentAt &&
  //       Date.now() - new Date(user.lastOtpSentAt).getTime() <
  //       OTP_RESEND_COOLDOWN_SECONDS * 1000
  //     ) {
  //       const waitSeconds = Math.ceil(
  //         (OTP_RESEND_COOLDOWN_SECONDS * 1000 -
  //           (Date.now() - new Date(user.lastOtpSentAt).getTime())) /
  //         1000
  //       );
  //       return res.status(429).json({
  //         success: false,
  //         message: `Please wait ${waitSeconds} seconds before requesting a new OTP.`,
  //       });
  //     }

  //     /* 5️⃣ Send OTP via MessageCentral */
  //     let response;
  //     try {
  //       response = await sendMessageCentral(cleanedMobile);
  //       console.log("ress", response.data);
  //     } catch (err) {
  //       const providerData = err.response?.data;
  //       console.error(
  //         "❌ MessageCentral SEND failed:",
  //         providerData || err.message
  //       );

  //       return res.status(502).json({
  //         success: false,
  //         message:
  //           providerData?.message ||
  //           providerData?.errorMessage ||
  //           "Failed to send OTP",
  //         provider: providerData,
  //       });
  //     }

  //     /* 6️⃣ Validate provider response */
  //     const data = response.data;
  //     const verificationId =
  //       data?.verificationId || data?.data?.verificationId || data?.id || null;

  //     const responseCode = Number(
  //       data?.responseCode || data?.data?.responseCode
  //     );

  //     if (response.status !== 200 || responseCode !== 200 || !verificationId) {
  //       console.error("❌ Invalid SEND response:", data);
  //       const mappedError = PROVIDER_MESSAGES[responseCode] || {
  //         message: "Failed to send OTP",
  //         status: 502,
  //       };
  //       return res.status(mappedError.status).json({
  //         success: false,
  //         message: mappedError.message,
  //         provider: data,
  //       });
  //     }

  //     /* 7️⃣ Save verification details */
  //     user.verificationId = verificationId;
  //     user.verificationExpiry = new Date(
  //       Date.now() + OTP_VALIDITY_MINUTES * 60 * 1000
  //     );
  //     user.lastOtpSentAt = new Date();
  //     user.otpAttempts = 0; // Reset attempts on new OTP send
  //     // Ensure our canonical isVerified flag is false when sending OTP
  //     user.isVerified = false;
  //     await user.save();

  //     return res.status(200).json({
  //       success: true,
  //       message: "OTP sent successfully",
  //     });
  //   } catch (error) {
  //     console.error("❌ Send OTP error:", error.message);
  //     return res
  //       .status(500)
  //       .json({ success: false, message: "Internal server error" });
  //   }
  // }

  // //   /* =======================
  // //    VERIFY OTP
  // // ======================= */
  // async verifyOTP(req, res) {
  //   try {
  //     const { mobileNumber, otp, fcmToken, role } = req.body;

  //     /* 1️⃣ Validate input */
  //     if (!mobileNumber) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Mobile number is required",
  //       });
  //     }

  //     if (!otp) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "OTP is required",
  //       });
  //     }

  //     const cleanedMobile = mobileNumber.toString().replace(/\D/g, "");

  //     if (!/^[6-9]\d{9}$/.test(cleanedMobile)) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Invalid Indian mobile number",
  //       });
  //     }

  //     /* 2️⃣ Find user */
  //     const Model = roleModelMap[role] || User;
  //     const user = await Model.findOne({ mobileNumber: cleanedMobile });

  //     if (!user) {
  //       if (role === "photographer") {
  //         return res.status(404).json({
  //           success: false,
  //           message: "Please contact admin",
  //         });
  //       }
  //       return res.status(404).json({
  //         success: false,
  //         message: "User not found",
  //       });
  //     }

  //     // Check Photographer Activation Status
  //     if (role === "photographer" && user.status !== "active") {
  //       return res.status(403).json({
  //         success: false,
  //         message: "Your account is unverified. Please contact the admin.",
  //       });
  //     }

  //     /* 2.1️⃣ Check Lock Status */
  //     if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
  //       const waitMinutes = Math.ceil(
  //         (new Date(user.lockUntil) - new Date()) / (60 * 1000)
  //       );
  //       return res.status(429).json({
  //         success: false,
  //         message: `Account locked due to too many failed attempts. Please try again in ${waitMinutes} minutes.`,
  //       });
  //     }
  //     /* 3️⃣ OTP BYPASS (DEV / QA) */
  //     if (
  //       process.env.OTP_BYPASS_ENABLED === "true" &&
  //       process.env.OTP_BYPASS_NUMBERS?.split(",").includes(cleanedMobile) &&
  //       otp === process.env.OTP_BYPASS_CODE
  //     ) {
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
  //
  //       // Add welcome notification
  //       try {
  //         const welcomeMessage = "Welcome to Veroa Studios";
  //         const query = { notification_message: welcomeMessage };
  //         if (role === "photographer") {
  //           query.photographer_id = user._id;
  //         } else if (role === "admin") {
  //           query.admin_id = user._id;
  //         } else {
  //           query.user_id = user._id;
  //         }
  //
  //         const existingNotification = await Notification.findOne(query);
  //
  //         if (!existingNotification) {
  //           await Notification.create({
  //             ...query,
  //             notification_type: "system",
  //           });
  //         }
  //       } catch (notificationError) {
  //         console.error("Error creating welcome notification:", notificationError);
  //       }
  //
  //       await user.save();

  //       res.cookie("token", token, {
  //         httpOnly: true,
  //         secure: process.env.NODE_ENV === "production",
  //         sameSite: "strict",
  //         maxAge: 7 * 24 * 60 * 60 * 1000,
  //       });

  //       return res.status(200).json({
  //         success: true,
  //         message: "OTP verified successfully (bypass)",
  //         token
  //       });
  //     }

  //     /* 4️⃣ Ensure OTP request exists */
  //     if (!user.verificationId) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "No OTP request found. Please resend OTP.",
  //       });
  //     }

  //     /* 5️⃣ Expiry check */
  //     if (
  //       !user.verificationExpiry ||
  //       new Date() > new Date(user.verificationExpiry)
  //     ) {
  //       user.verificationId = null;
  //       user.verificationExpiry = null;
  //       await user.save();

  //       return res.status(400).json({
  //         success: false,
  //         message: "OTP expired. Please resend OTP.",
  //       });
  //     }

  //     /* 7️⃣ VERIFY OTP */
  //     let response;

  //     try {
  //       response = await verifyMessageCentral(user.verificationId, otp);
  //     } catch (err) {
  //       console.error("❌ MessageCentral VERIFY error:");

  //       // 🔹 Timeout
  //       if (err.code === "ECONNABORTED") {
  //         return res.status(503).json({
  //           success: false,
  //           message: "OTP verification service timeout. Please try again.",
  //         });
  //       }

  //       // 🔹 Network / DNS error
  //       if (!err.response) {
  //         return res.status(503).json({
  //           success: false,
  //           message:
  //             "Unable to reach OTP verification service. Please try again later.",
  //         });
  //       }

  //       // 🔹 Provider responded with error
  //       const providerData = err.response?.data || {};
  //       const providerCode =
  //         providerData?.responseCode ||
  //         providerData?.data?.responseCode ||
  //         err.response?.status;

  //       console.error("Provider Status:", err.response?.status);
  //       console.error("Provider Response:", providerData);

  //       const mappedError = PROVIDER_MESSAGES[providerCode] || {
  //         message: "Invalid or expired OTP",
  //         status: 400,
  //       };

  //       return res.status(mappedError.status).json({
  //         success: false,
  //         message: mappedError.message,
  //         providerCode,
  //       });
  //     }

  //     /* 8️⃣ Validate provider success response */
  //     const data = response?.data || {};

  //     const providerCode = Number(
  //       data?.responseCode ||
  //       data?.data?.responseCode ||
  //       0
  //     );

  //     if (response.status !== 200 || providerCode !== 200) {
  //       // Handle specific failure cases
  //       if (providerCode === 702) {
  //         // WRONG_OTP_PROVIDED
  //         user.otpAttempts = (user.otpAttempts || 0) + 1;
  //         if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
  //           user.lockUntil = new Date(
  //             Date.now() + OTP_LOCK_MINUTES * 60 * 1000
  //           );
  //           user.otpAttempts = 0; // Reset attempts after locking
  //           await user.save();
  //           return res.status(403).json({
  //             success: false,
  //             message: `Maximum verification attempts exceeded. Account locked for ${OTP_LOCK_MINUTES} minutes.`,
  //             code: "ACCOUNT_LOCKED",
  //           });
  //         }
  //         await user.save();
  //         return res.status(400).json({
  //           success: false,
  //           message: `Wrong OTP entered. You have ${OTP_MAX_ATTEMPTS - user.otpAttempts
  //             } attempts remaining.`,
  //           providerCode,
  //         });
  //       }

  //       const mappedError = PROVIDER_MESSAGES[providerCode] || {
  //         message: "Invalid or expired OTP",
  //         status: 400,
  //       };

  //       return res.status(mappedError.status).json({
  //         success: false,
  //         message: mappedError.message,
  //         providerCode,
  //       });
  //     }

  //     /* 9️⃣ SUCCESS — finalize login */
  //     user.isVerified = true;
  //     user.verificationId = null;
  //     user.verificationExpiry = null;
  //     user.otpAttempts = 0;
  //     user.lockUntil = null;

  //     if (fcmToken) user.fcmToken = fcmToken;

  //     const token = signToken({
  //       id: user._id,
  //       mobileNumber: user.mobileNumber,
  //       userType: user.userType,
  //       isAdmin: !!user.isAdmin,
  //     });

  //     user.token = token;
  //
  //     // Add welcome notification
  //     try {
  //       const welcomeMessage = "Welcome to Veroa Studios";
  //       const query = { notification_message: welcomeMessage };
  //       if (role === "photographer") {
  //         query.photographer_id = user._id;
  //       } else if (role === "admin") {
  //         query.admin_id = user._id;
  //       } else {
  //         query.user_id = user._id;
  //       }
  //
  //       const existingNotification = await Notification.findOne(query);
  //
  //       if (!existingNotification) {
  //         await Notification.create({
  //           ...query,
  //           notification_type: "system",
  //         });
  //       }
  //     } catch (notificationError) {
  //       console.error("Error creating welcome notification:", notificationError);
  //     }
  //
  //     await user.save();

  //     return res.status(200).json({
  //       success: true,
  //       message: "OTP verified successfully",
  //       token,
  //       user,
  //     });

  //   } catch (error) {
  //     console.error("❌ verifyOTP internal error:", error);
  //     return res.status(500).json({
  //       success: false,
  //       message: "Internal server error",
  //     });
  //   }
  // }


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
  async sendOTP(req, res, next) {
    try {
      const { mobileNumber, role } = req.body;
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

      let user = await Model.findOne({
        mobileNumber: cleanedMobile,
      });

      // Special check for Photographer account status
      if (role === "photographer" && user && user.status !== "active") {
        return res.status(403).json({
          success: false,
          message: "Your account is unverified. Please contact the admin.",
        });
      }

      // Hardcoded static OTP numbers for testing/bypass
      const staticOtpNumbers = ["9322046187", "9325983803", "9096698947"];

      if (staticOtpNumbers.includes(cleanedMobile)) {
        if (!user) {
          user = await Model.create({
            mobileNumber: cleanedMobile,
            userType: role || "user",
            verificationId: "1234", // Dummy ID for bypass
          });
        }
        return res.status(200).json({
          success: true,
          message: "YOUR OTP IS 1234",
        });
      }

      // OTHERWISE: Send real OTP via MessageCentral
      if (!user) {
        if (role === "photographer") {
          return res.status(404).json({
            success: false,
            message: "Account not found. Please contact admin.",
          });
        }
        user = await Model.create({
          mobileNumber: cleanedMobile,
          userType: role || "user",
        });
      }

      try {
        const response = await sendMessageCentral(cleanedMobile);
        const data = response.data;
        const verificationId = data?.verificationId || data?.data?.verificationId || data?.id || null;

        if (response.status === 200 && verificationId) {
          user.verificationId = verificationId;
          user.verificationExpiry = new Date(Date.now() + OTP_VALIDITY_MINUTES * 60 * 1000);
          user.lastOtpSentAt = new Date();
          await user.save();

          return res.status(200).json({
            success: true,
            message: "OTP sent successfully",
          });
        } else {
          throw new Error("Invalid response from SMS provider");
        }
      } catch (smsErr) {
        console.error("SMS SEND FAILED:", smsErr.message);
        return res.status(502).json({
          success: false,
          message: "Failed to send OTP via SMS. Please try again later.",
        });
      }
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
      const { mobileNumber, otp, role, fcmToken } = req.body;

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

      const Model = roleModelMap[role];
      /* 2️⃣ Find user */
      const user = await Model.findOne({
        mobileNumber: cleanedMobile,
      });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const staticOtpNumbers = ["9322046187", "9325983803", "9096698947"];
      let isVerified = false;

      // Check for static OTP bypass for specific numbers
      if (otp === "1234" && staticOtpNumbers.includes(cleanedMobile)) {
        isVerified = true;
      } else {
        // PRODUCTION LOGIC: Verify via MessageCentral
        if (!user.verificationId) {
          return res.status(400).json({
            success: false,
            message: "No active OTP found. Please request a new one.",
          });
        }

        try {
          const response = await verifyMessageCentral(user.verificationId, otp);
          const responseData = response?.data || {};
          const providerCode = Number(responseData.responseCode || responseData.data?.responseCode || 0);

          if (response.status === 200 && providerCode === 200) {
            isVerified = true;
          }
        } catch (err) {
          console.error("OTP verification service failed:", err.message);
          return res.status(502).json({
            success: false,
            message: "OTP service unavailable. Please try again later.",
          });
        }
      }

      if (isVerified) {
        const token = signToken({
          id: user._id,
          mobileNumber: user.mobileNumber,
          userType: user.userType,
        });

        // Welcome notification removed as per user request


        user.verificationId = null; // Clear OTP after success
        if (fcmToken) {
          user.fcmToken = fcmToken;
        }
        await user.save();

        return res.status(200).json({
          success: true,
          message: "OTP verified successfully",
          token: token,
          fcmToken: fcmToken,
          id: user._id,
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
        message: error.message || "Internal server error",
      });
    }
  }


  //static 1234 OTP And Verify Code Ends

  // get Token API for a longer session

  async getToken(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Token is required",
        });
      }

      let decoded;

      try {
        // 🔍 Verify token (this automatically checks expiry)
        decoded = verifyToken(token);
      } catch (err) {
        return res.status(401).json({
          success: false,
          message: "Session expired",
        });
      }

      const Model = roleModelMap[decoded.userType] || User;
      const user = await Model.findById(decoded.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // ✅ Session is valid — return same token + id
      return res.status(200).json({
        success: true,
        message: "Session active",
        token: token,   // return same token
        id: user._id,
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }
    // Unified Logout for all roles
  async logout(req, res) {
    try {
      const { fcmToken, role } = req.body;
      const id = req.user?.id || req.user?._id;

      if (id && role) {
        // Use the role map to find the correct database model
        const Model = roleModelMap[role] || User;
        const account = await Model.findById(id);

        if (account && account.fcmToken === fcmToken) {
          // Clear the FCM token from DB
          await Model.findByIdAndUpdate(id, { $unset: { fcmToken: "" } });
          console.log(`[Logout] Cleared FCM token for ${role}: ${id}`);
        }
      }

      res.clearCookie("token");
      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error("Unified Logout error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during logout",
      });
    }
  }
}

export default new AuthController();
