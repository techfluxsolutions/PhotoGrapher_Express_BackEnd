import Photographer from "../../models/Photographer.mjs";
import PlatformSettings from "../../models/PlatformSettings.mjs";
import PhotographerRatingsGivenByAdminAndUser from "../../models/PhotographerRatingsGivenByAdmin&User.mjs";
import ServiceBooking from "../../models/ServiceBookings.mjs";
import bcrypt from "bcrypt";
//import { sendWelcomeEmail } from "../../utils/emailService.mjs";
import mongoose from "mongoose";
import { sendMessageCentral, verifyMessageCentral } from "../../utils/messageCentral.mjs";
import razorpayInstance from "../../Config/razorpay.mjs";
import Notification from "../../models/Notification.mjs";
import { emitNotificationCount } from "../../services/SocketService.mjs";

class PhotographerController {
    // Get All Photographers (Unified endpoint with filtering)
    async getAllPhotographers(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.max(1, parseInt(req.query.limit) || 20);
            const skip = (page - 1) * limit;

            // Filter logic
            let query = {};
            // Default to 'active' if no status is provided
            if (!req.query.status) {
                query = { status: "active" };
            } else if (req.query.status !== 'all') {
                // If specific status (e.g. 'pending', 'active') is requested
                query = { status: req.query.status };
            }

            const items = await Photographer.find(query)
                .select('basicInfo.fullName basicInfo.profilePhoto email mobileNumber professionalDetails.yearsOfExperience professionalDetails.primaryLocation professionalDetails.startUpDate professionalDetails.team_studio professionalDetails.expertiseLevel professionalDetails.photographerType servicesAndStyles.services status createdAt commissionPercentage')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });

            const total = await Photographer.countDocuments(query);

            // Transform response
            const transformedItems = items.map(p => this._transformPhotographerData(p, req));

            res.status(200).json({
                success: true,
                message: "Photographers fetched successfully",
                photographers: transformedItems,
                meta: { total, page, limit }
            });
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch photographers", error: error.message });
        }
    }

    // Helper to transform photographer data uniformly
    _transformPhotographerData(p, req) {
        const date = new Date(p.createdAt);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        let verificationStatus = "Inactive";
        if (p.status === 'active') verificationStatus = "Verified";
        if (p.status === 'pending') verificationStatus = "Unverified";

        const baseUrl = req ? `${req.protocol}://${req.get("host")}` : "";
        let profilePhoto = p.basicInfo?.profilePhoto || "";
        if (profilePhoto && !profilePhoto.startsWith("http")) {
            profilePhoto = `${baseUrl}/${profilePhoto.replace(/\\/g, "/").replace(/^\//, "")}`;
        }

        return {
            _id: p._id,
            name: p.basicInfo?.fullName,
            email: p.email,
            phone: p.mobileNumber,
            experience: p.professionalDetails?.yearsOfExperience,
            city: p.professionalDetails?.primaryLocation,
            status: p.status,
            verificationStatus: verificationStatus,
            profilePhoto,
            createdAt: p.createdAt,
            signUpDate: p.professionalDetails?.startUpDate || `${day}/${month}/${year}`,
            commissionPercentage: p.commissionPercentage || 0,
            team_studio: p.professionalDetails?.team_studio || "",
            expertiseLevel: p.professionalDetails?.expertiseLevel || "N/A",
            categories: p.servicesAndStyles?.services ?
                Object.keys(p.servicesAndStyles.services).filter(key => p.servicesAndStyles.services[key] === true) : [],
            isAbleToVerify: (
                !p.professionalDetails?.yearsOfExperience ||
                !p.professionalDetails?.primaryLocation ||
                !p.professionalDetails?.expertiseLevel ||
                !p.professionalDetails?.photographerType
            ) ? true : false
        };
    }

    // Helper to validate profile completeness
    _validateProfileCompleteness(photographerDoc) {
        const missingFields = [];
        const p = photographerDoc.toObject ? photographerDoc.toObject() : photographerDoc;

        // 1. Personal Info (Basic Info)
        if (!p.basicInfo?.fullName) missingFields.push("Full Name");
        if (!p.basicInfo?.displayName) missingFields.push("Display Name");
        if (!p.basicInfo?.phone) missingFields.push("Mobile Number");

        // 2. Professional Details
        if (!p.professionalDetails?.photographerType) missingFields.push("Photographer Type");
        if (!p.professionalDetails?.expertiseLevel) missingFields.push("Expertise Level");
        if (!p.professionalDetails?.yearsOfExperience) missingFields.push("Years of Experience");
        if (!p.professionalDetails?.primaryLocation) missingFields.push("Primary Location");

        // 3. Bank Information
        if (!p.bank_account_holder) missingFields.push("Bank Account Holder Name");
        if (!p.bank_name) missingFields.push("Bank Name");
        if (!p.bank_account_number) missingFields.push("Account Number");
        if (!p.bank_ifsc) missingFields.push("Bank IFSC Code");
        if (!p.account_type) missingFields.push("Account Type");

        // 4. Services
        const services = p.servicesAndStyles?.services || {};

        // Helper to check if any field in an object is "truthy" (true, 1, "true", "on")
        const isSelected = (obj) => Object.entries(obj).some(([key, val]) => {
            if (key === "_id" || key === "id") return false;
            if (val === true || val === 1 || val === "true" || val === "on") return true;
            if (typeof val === 'string' && val.toLowerCase() === 'true') return true;
            return false;
        });

        const hasService = isSelected(services);

        if (!hasService) missingFields.push("At least one service selected");

        return missingFields;
    }

    // Get photographer status only
    async getPhotographerStatus(req, res) {
        try {
            const id = req.params.id || req.user?.id || req.user?._id || req.photographer?._id;

            if (!id) {
                return res.status(400).json({ success: false, message: "Photographer ID required" });
            }

            const photographer = await Photographer.findById(id).select('status');
            if (!photographer) {
                return res.status(404).json({ success: false, message: "Photographer not found" });
            }

            res.status(200).json({
                success: true,
                isActive: photographer.status === 'active',
                status: photographer.status
            });
        } catch (error) {
            res.status(500).json({ success: false, message: "Failed to fetch photographer status", error: error.message });
        }
    }

    // Update photographer status
    async updatePhotographerStatus(req, res) {
        try {
            const id = req.params.id || req.user?.id || req.user?._id || req.photographer?._id;
            const { status } = req.body;

            if (!id) {
                return res.status(400).json({ success: false, message: "Photographer ID required" });
            }

            if (!status) {
                return res.status(400).json({ success: false, message: "Status is required" });
            }

            // Validate status enum
            const validStatuses = ["active", "inactive", "pending"];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
            }

            const photographer = await Photographer.findByIdAndUpdate(
                id,
                { $set: { status } },
                { new: true, runValidators: true }
            ).select('status');

            if (!photographer) {
                return res.status(404).json({ success: false, message: "Photographer not found" });
            }

            res.status(200).json({
                success: true,
                message: "Photographer status updated successfully",
                status: photographer.status,
                isActive: photographer.status === 'active'
            });
        } catch (error) {
            res.status(500).json({ success: false, message: "Failed to update photographer status", error: error.message });
        }
    }

    // get photographer by id (Supports Admin/Public via :id, or Self via Auth)
    async getPhotographerById(req, res) {
        try {
            console.log("getPhotographerById hit with params:", req.params);
            // Priority: Params ID (Admin/Public) -> Auth User ID (Self, 'id' from token) -> Auth Photographer ID
            const id = req.params.id || req.user?.id || req.user?._id || req.photographer?._id;

            if (!id) {
                return res.status(400).json({ message: "Photographer ID required" });
            }

            const photographer = await Photographer.findById(id);
            if (!photographer) {
                return res.status(404).json({ message: "Photographer not found" });
            }

            // Add Base URL to Photo
            const photographerObj = photographer.toObject();
            if (photographerObj.basicInfo?.profilePhoto && !photographerObj.basicInfo.profilePhoto.startsWith("http")) {
                const baseUrl = `${req.protocol}://${req.get("host")}`;
                photographerObj.basicInfo.profilePhoto = `${baseUrl}/${photographerObj.basicInfo.profilePhoto.replace(/\\/g, "/").replace(/^\//, "")}`;
            }

            res.status(200).json({ success: true, message: "Photographer fetched successfully", photographer: photographerObj });
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch photographer", error: error.message });
        }
    }

    // --- Unverified / Pending Logic ---

    // Add Unverified Photographer (Status: Pending)
    async addUnverifiedPhotographer(req, res) {
        try {
            const { name, email, phone, experience, city, startUpDate, signUpDate } = req.body;

            // 1. Mandatory Validations
            const required = { name, email, phone, experience, city };
            const missing = Object.keys(required).filter(k => !required[k]);

            if (missing.length > 0) {
                return res.status(200).json({
                    success: false,
                    message: `${missing.join(", ")} is required.`
                });
            }

            // 2. Format Validations
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const phoneRegex = /^\d{10}$/;

            if (!emailRegex.test(email)) {
                return res.status(400).json({ success: false, message: "Invalid email format." });
            }
            if (!phoneRegex.test(phone)) {
                return res.status(400).json({ success: false, message: "Mobile number must be exactly 10 digits." });
            }

            // 3. Uniqueness Checks
            const [existingEmail, existingPhone] = await Promise.all([
                Photographer.findOne({ email }),
                Photographer.findOne({ mobileNumber: phone })
            ]);

            if (existingEmail) {
                return res.status(400).json({ success: false, message: "A photographer with this email already exists." });
            }
            if (existingPhone) {
                return res.status(400).json({ success: false, message: "A photographer with this mobile number already exists." });
            }

            // Create with status: pending
            const newPhotographer = new Photographer({
                username: undefined,
                email,
                mobileNumber: phone,
                basicInfo: {
                    fullName: name,
                    email: email,
                    phone: phone
                },
                professionalDetails: {
                    yearsOfExperience: experience,
                    primaryLocation: city,
                    startUpDate: startUpDate || signUpDate,
                    team_studio: req.body.team_studio || ""
                },
                status: "pending"
            });

            await newPhotographer.save();

            res.status(201).json({
                success: true,
                message: "Photographer added successfully",
                photographer: {
                    _id: newPhotographer._id,
                    name: newPhotographer.basicInfo.fullName,
                    email: newPhotographer.email,
                    phone: newPhotographer.mobileNumber,
                    experience: newPhotographer.professionalDetails.yearsOfExperience,
                    city: newPhotographer.professionalDetails.primaryLocation,
                    status: newPhotographer.status,
                    createdAt: newPhotographer.createdAt,
                    signUpDate: newPhotographer.professionalDetails.startUpDate || `${String(newPhotographer.createdAt.getDate()).padStart(2, '0')}/${String(newPhotographer.createdAt.getMonth() + 1).padStart(2, '0')}/${newPhotographer.createdAt.getFullYear()}`
                }
            });

        } catch (error) {
            res.status(500).json({ success: false, message: "Failed to add unverified photographer", error: error.message });
        }
    }



    // Update Unverified Photographer
    async updateUnverifiedPhotographer(req, res) {
        try {
            const { id } = req.params;
            const { name, email, phone, experience, city, startUpDate, signUpDate } = req.body;

            // 1. Mandatory Validations (If provided they cannot be empty)
            const requiredFields = ['name', 'email', 'phone', 'experience', 'city'];
            for (const field of requiredFields) {
                if (req.body[field] === "") {
                    return res.status(200).json({ success: false, message: `${field} cannot be empty.` });
                }
            }

            // 2. Format Validations
            if (email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return res.status(400).json({ success: false, message: "Invalid email format." });
                }
            }
            if (phone) {
                const phoneRegex = /^\d{10}$/;
                if (!phoneRegex.test(phone)) {
                    return res.status(400).json({ success: false, message: "Mobile number must be exactly 10 digits." });
                }
            }

            const photographer = await Photographer.findById(id);

            if (!photographer) {
                return res.status(404).json({ success: false, message: "Photographer not found" });
            }

            // 2. Uniqueness Checks
            if (email && email !== photographer.email) {
                const existingUser = await Photographer.findOne({ email });
                if (existingUser) {
                    return res.status(400).json({ success: false, message: "This email is already taken by another photographer." });
                }
            }

            if (phone && phone !== photographer.mobileNumber) {
                const existingUser = await Photographer.findOne({ mobileNumber: phone });
                if (existingUser) {
                    return res.status(400).json({ success: false, message: "This mobile number is already taken by another photographer." });
                }
            }

            // Update fields manually as per the schema structure for unverified (pending) photographers
            if (name) photographer.basicInfo.fullName = name;
            if (email) {
                photographer.email = email;
                photographer.basicInfo.email = email;
            }
            if (phone) {
                photographer.mobileNumber = phone;
                photographer.basicInfo.phone = phone;
            }
            if (experience) photographer.professionalDetails.yearsOfExperience = experience;
            if (city) photographer.professionalDetails.primaryLocation = city;
            const dateToUpdate = startUpDate || signUpDate;
            if (dateToUpdate) photographer.professionalDetails.startUpDate = dateToUpdate;
            if (req.body.team_studio) photographer.professionalDetails.team_studio = req.body.team_studio;

            await photographer.save();

            res.status(200).json({
                success: true,
                message: "Photographer updated successfully",
                photographer: {
                    _id: photographer._id,
                    name: photographer.basicInfo.fullName,
                    email: photographer.email,
                    phone: photographer.mobileNumber,
                    experience: photographer.professionalDetails.yearsOfExperience,
                    city: photographer.professionalDetails.primaryLocation,
                    status: photographer.status,
                    signUpDate: photographer.professionalDetails.startUpDate || `${String(photographer.createdAt.getDate()).padStart(2, '0')}/${String(photographer.createdAt.getMonth() + 1).padStart(2, '0')}/${photographer.createdAt.getFullYear()}`,
                    team_studio: photographer.professionalDetails.team_studio || "",
                    createdAt: photographer.createdAt
                }
            });

        } catch (error) {
            res.status(500).json({ message: "Failed to update photographer", error: error.message });
        }
    }

    // Verify Photographer (Password + Status Activation Only)

    async sendOTP(req, res) {
        try {
            const { mobileNumber } = req.body;
            if (!mobileNumber) {
                return res.status(400).json({ message: "Mobile number is required" });
            }

            const cleanedMobile = mobileNumber.toString().replace(/\D/g, "");
            const photographer = await Photographer.findOne({ mobileNumber: cleanedMobile });

            if (!photographer) {
                return res.status(404).json({ message: "Photographer not found" });
            }

            // Check for profile completeness before sending OTP
            const missing = this._validateProfileCompleteness(photographer);
            if (missing.length > 0) {
                return res.status(200).json({
                    success: false,
                    message: "Cannot send OTP. Photographer profile is incomplete.",
                    missingFields: missing
                });
            }

            const response = await sendMessageCentral(cleanedMobile);
            const data = response.data;

            const verificationId = data?.verificationId || data?.data?.verificationId || data?.id || null;
            if (!verificationId) {
                return res.status(502).json({ message: "Failed to send OTP", provider: data });
            }

            photographer.verificationId = verificationId;
            photographer.verificationExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
            await photographer.save();

            res.status(200).json({ success: true, message: "OTP sent successfully" });
        } catch (error) {
            console.error("Send OTP Error:", error);
            res.status(500).json({ message: "Failed to send OTP", error: error.message });
        }
    }
    async verifyPhotographer(req, res) {
        try {
            // const { id } = req.params;
            const { mobileNumber, OTP } = req.body;

            if (!mobileNumber || !OTP) {
                return res.status(400).json({ message: "Mobile number and OTP are required" });
            }

            // 2. Find Photographer
            let photographer;
            // if (id) {
            //     photographer = await Photographer.findById(id);
            // } else {
            const cleanedMobile = mobileNumber.toString().replace(/\D/g, "");
            photographer = await Photographer.findOne({ mobileNumber: cleanedMobile });
            // }
            console.log(photographer);
            if (!photographer) {
                return res.status(404).json({ message: "Photographer not found" });
            }

            if (photographer.status === 'active') {
                return res.status(400).json({ message: "Photographer is already verified" });
            }

            if (!photographer.verificationId) {
                return res.status(400).json({ message: "No OTP request found. Please resend OTP." });
            }

            try {
                await verifyMessageCentral(photographer.verificationId, OTP);
            } catch (err) {
                return res.status(400).json({ message: "Invalid or expired OTP", details: err.response?.data || err.message });
            }

            // Clear verification details
            photographer.verificationId = null;
            photographer.verificationExpiry = null;

            // Set username to email as requested
            photographer.username = photographer.email;
            photographer.status = "active";
            // Create Razorpay account if not exists

            // commenting this due to no route feature is enabled till yet 
            // if (!photographer.razorpayAccountId) {
            //     const accountData = {
            //         type: 'route',
            //         email: photographer.email,
            //         phone: photographer.mobileNumber || photographer.basicInfo?.phone,
            //         legal_business_name: photographer.bank_account_holder || photographer.basicInfo?.fullName || photographer.username || "Photographer",
            //         business_type: "individual", // Default to individual
            //         contact_name: photographer.basicInfo?.fullName || photographer.username || "Photographer",
            //         profile: {
            //             category: "ecommerce",
            //             subcategory: "digital_goods"
            //         }
            //     };
            //     const account = await razorpayInstance.accounts.create(accountData);
            //     photographer.razorpayAccountId = account.id;
            //     // await photographer.save();
            // }
            // END  commenting this due to no route feature is enabled till yet 
            await photographer.save();

            // Send welcome email with login credentials
            // try {
            //     if (password && photographer.email) {
            //         await sendWelcomeEmail(photographer.email, photographer.username, password);
            //     }
            // } catch (emailError) {
            //     console.error("Error sending welcome email during verification:", emailError);
            // }

            // Add welcome notification
            try {
                const welcomeMessage = "Welcome to Veroa Studios! Explore your dashboard to start.";
                const query = { 
                    photographer_id: photographer._id, 
                    notification_message: welcomeMessage 
                };

                const existingNotification = await Notification.findOne(query);

                if (!existingNotification) {
                    await Notification.create({
                        ...query,
                        notification_type: "system",
                    });
                    emitNotificationCount(photographer._id.toString());
                }
            } catch (notificationError) {
                console.error("Error creating welcome notification:", notificationError);
            }

            res.status(200).json({
                success: true,
                message: "Photographer verified and activated successfully",
                photographer: {
                    _id: photographer._id,
                    email: photographer.email,
                    status: photographer.status
                }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Failed to verify photographer", error: error.message });
        }
    }

    // Create/Complete Profile (Post-Verification)
    async createProfile(req, res) {
        try {
            const { id } = req.params;
            const profileData = req.body;

            const photographer = await Photographer.findById(id);
            if (!photographer) {
                return res.status(404).json({ message: "Photographer not found" });
            }

            // 1. Map Expertise Level (Beginner -> INITIO, etc.)
            if (profileData.professionalDetails?.expertiseLevel) {
                const levelMap = {
                    "Beginner": "INITIO",
                    "Expert": "ELITE",
                    "Master": "PRO"
                };
                const level = profileData.professionalDetails.expertiseLevel;
                profileData.professionalDetails.expertiseLevel = levelMap[level] || level.toUpperCase();
            }

            // 2. Sanitize Bank Details
            if (profileData.bank_ifsc) {
                profileData.bank_ifsc = profileData.bank_ifsc.trim().toUpperCase();
            }

            // 3. Bank Details Validation
            if (profileData.bank_account_number && profileData.confirm_account_number) {
                if (profileData.bank_account_number !== profileData.confirm_account_number) {
                    return res.status(400).json({
                        success: false,
                        message: "Account number and Confirm account number do not match."
                    });
                }
            }

            // Update Fields (Safe merge using toObject/set)
            if (profileData.basicInfo) {
                const current = photographer.basicInfo ? photographer.basicInfo.toObject() : {};
                photographer.basicInfo = { ...current, ...profileData.basicInfo };
            }
            if (profileData.professionalDetails) {
                const current = photographer.professionalDetails ? photographer.professionalDetails.toObject() : {};
                photographer.professionalDetails = { ...current, ...profileData.professionalDetails };
            }
            if (profileData.photographyAccessories) photographer.photographyAccessories = profileData.photographyAccessories;

            if (profileData.aboutYou) photographer.aboutYou = profileData.aboutYou;

            if (profileData.servicesAndStyles) {
                const currentServices = (photographer.servicesAndStyles && photographer.servicesAndStyles.services) ? photographer.servicesAndStyles.services.toObject() : {};
                const currentStyles = (photographer.servicesAndStyles && photographer.servicesAndStyles.styles) ? photographer.servicesAndStyles.styles.toObject() : {};

                photographer.servicesAndStyles = {
                    services: { ...currentServices, ...profileData.servicesAndStyles.services },
                    styles: { ...currentStyles, ...profileData.servicesAndStyles.styles }
                };
            }

            if (profileData.availability) photographer.availability = { ...photographer.availability.toObject(), ...profileData.availability };
            if (profileData.pricing) photographer.pricing = { ...photographer.pricing.toObject(), ...profileData.pricing };

            // Bank Details
            if (profileData.bank_account_holder) photographer.bank_account_holder = profileData.bank_account_holder;
            if (profileData.bank_name) photographer.bank_name = profileData.bank_name;
            if (profileData.bank_account_number) photographer.bank_account_number = profileData.bank_account_number;
            if (profileData.bank_ifsc) photographer.bank_ifsc = profileData.bank_ifsc;
            if (profileData.account_type) photographer.account_type = profileData.account_type;

            if (profileData.calendar_availability) photographer.calendar_availability = profileData.calendar_availability;

            await photographer.save();
            res.status(200).json({
                success: true,
                message: "Photographer profile created successfully and razorpay account created successfully",
                photographer
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Failed to create profile", error: error.message });
        }
    }

    // create photographer (Direct Admin Create - Active)
    async createPhotographer(req, res) {
        try {
            const payload = req.body;
            const plainPassword = payload.password; // Capture plain password before hashing

            // Check if username already exists
            const existingUser = await Photographer.findOne({ username: payload.username });
            if (existingUser) {
                return res.status(400).json({ message: "Username already exists" });
            }

            // Hash password if provided
            if (payload.password) {
                const salt = await bcrypt.genSalt(10);
                payload.password = await bcrypt.hash(payload.password, salt);
            }

            const photographer = new Photographer(payload);
            await photographer.save();

            // Send welcome email if password was provided
            // if (plainPassword && photographer.email) {
            //     await sendWelcomeEmail(photographer.email, photographer.username || photographer.email, plainPassword);
            // }

            res.status(201).json({ message: "Photographer created successfully", photographer });
        } catch (error) {
            res.status(500).json({ message: "Failed to create photographer", error: error.message });
        }
    }

    // update photographer (Supports Admin via :id, or Self via Auth)
    async updatePhotographer(req, res) {
        try {
            console.log("Update Photographer Request Body:", JSON.stringify(req.body, null, 2));
            if (req.file) console.log("Update Photographer Request File:", req.file.fieldname);

            // Priority: Params ID (Admin) -> Auth User ID (Self, 'id' from token) -> Auth Photographer ID
            const id = req.params.id || req.user?.id || req.user?._id || req.photographer?._id;

            if (!id) {
                return res.status(400).json({ message: "Photographer ID required" });
            }

            const photographer = await Photographer.findById(id);
            if (!photographer) {
                return res.status(200).json({ success: false, message: "Photographer not found" });
            }

            let updateData = { ...req.body };

            // 0. Handle 'data' wrapper if sent via FormData (common in frontend)
            if (updateData.data && typeof updateData.data === 'string') {
                try {
                    const parsedData = JSON.parse(updateData.data);
                    updateData = { ...updateData, ...parsedData };
                    delete updateData.data;
                } catch (e) {
                    console.error("Failed to parse 'data' field:", e.message);
                }
            }

            // 1. Basic validation: ensure provided fields are not empty strings/nulls
            for (const [key, value] of Object.entries(updateData)) {
                if ((value === "" || value === null || value === undefined) && key !== "aboutYou") {
                    const cleanKey = key.replace(/_/g, ' ');
                    const capitalizedKey = cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1);
                    return res.status(400).json({
                        success: false,
                        message: `${capitalizedKey} cannot be empty`,
                    });
                }
            }

            // 2. Handle JSON strings from FormData for nested objects
            const nestedObjects = ['basicInfo', 'professionalDetails', 'servicesAndStyles', 'availability', 'pricing', 'photographyAccessories'];
            nestedObjects.forEach(field => {
                if (updateData[field] && typeof updateData[field] === 'string') {
                    try {
                        updateData[field] = JSON.parse(updateData[field]);
                    } catch (e) {
                        console.error(`Failed to parse ${field}:`, e.message);
                    }
                }
            });

            // 3. Map flat fields to nested objects (Utility for simple FormData)
            if (!updateData.basicInfo && (updateData.fullName || updateData.displayName || updateData.phone)) {
                updateData.basicInfo = {};
            }
            if (updateData.fullName) updateData.basicInfo.fullName = updateData.fullName;
            if (updateData.displayName) updateData.basicInfo.displayName = updateData.displayName;
            if (updateData.phone) updateData.basicInfo.phone = updateData.phone;

            if (!updateData.professionalDetails && (updateData.expertiseLevel || updateData.yearsOfExperience || updateData.primaryLocation)) {
                updateData.professionalDetails = {};
            }
            if (updateData.expertiseLevel) {
                const levelMap = { "Beginner": "INITIO", "Expert": "ELITE", "Master": "PRO" };
                const level = updateData.expertiseLevel;
                updateData.professionalDetails.expertiseLevel = levelMap[level] || level.toUpperCase();
            }
            if (updateData.yearsOfExperience) updateData.professionalDetails.yearsOfExperience = updateData.yearsOfExperience;
            if (updateData.primaryLocation) updateData.professionalDetails.primaryLocation = updateData.primaryLocation;

            // 4. Sanitize Bank Details
            if (updateData.bank_ifsc) {
                updateData.bank_ifsc = updateData.bank_ifsc.trim().toUpperCase();
            }

            // 5. Bank Details Validation (Confirm Account Number)
            if (updateData.bank_account_number && updateData.confirm_account_number) {
                if (updateData.bank_account_number !== updateData.confirm_account_number) {
                    return res.status(400).json({
                        success: false,
                        message: "Account number and Confirm account number do not match."
                    });
                }
            }

            // 6. Handle Profile Photo Upload
            if (req.file) {
                if (!updateData.basicInfo) updateData.basicInfo = {};
                updateData.basicInfo.profilePhoto = `/uploads/${req.file.filename}`;
            }

            // 7. Handle Password update
            if (updateData.password) {
                const salt = await bcrypt.genSalt(10);
                updateData.password = await bcrypt.hash(updateData.password, salt);
            }

            // 8. Flatten and Apply Updates
            const flatten = (obj, prefix = '') => {
                let flattened = {};
                for (let key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        const newKey = prefix ? `${prefix}.${key}` : key;
                        if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date) && !(obj[key] instanceof mongoose.Types.ObjectId)) {
                            Object.assign(flattened, flatten(obj[key], newKey));
                        } else {
                            flattened[newKey] = obj[key];
                        }
                    }
                }
                return flattened;
            };

            const flatUpdateData = flatten(updateData);
            console.log("Applying updates to photographer:", JSON.stringify(flatUpdateData, null, 2));

            // Use set for partial updates on the document object to allow validation
            // We iterate to ensure dot-notation paths are handled correctly by the document instance
            Object.keys(flatUpdateData).forEach((path) => {
                photographer.set(path, flatUpdateData[path]);
            });

            // 9. Profile Completeness Validation (Only for self-updates /me)
            if (!req.params.id) {
                const missing = this._validateProfileCompleteness(photographer);
                if (missing.length > 0) {
                    return res.status(200).json({
                        success: false,
                        message: `Profile update failed. The following required fields are missing: ${missing.join(", ")}`,
                        missingFields: missing
                    });
                }
            }

            await photographer.save();

            // Prepend Base URL to Photo in response
            const photographerObj = photographer.toObject();
            if (photographerObj.basicInfo?.profilePhoto && !photographerObj.basicInfo.profilePhoto.startsWith("http")) {
                const baseUrl = `${req.protocol}://${req.get("host")}`;
                photographerObj.basicInfo.profilePhoto = `${baseUrl}/${photographerObj.basicInfo.profilePhoto.replace(/\\/g, "/").replace(/^\//, "")}`;
            }

            res.status(200).json({ success: true, message: "Photographer updated successfully", photographer: photographerObj });
        } catch (error) {
            console.error("Update Photographer Error:", error);
            
            // Determine status code (use 400 for validation errors, 500 otherwise)
            const statusCode = error.name === "ValidationError" || error.message.includes("validation failed") ? 400 : 500;
            
            // Construct a concise, professional message incorporating the technical error
            const professionalMessage = `Profile update failed: ${error.message}. Please check your details and try again.`;

            res.status(statusCode).json({ 
                success: false, 
                message: professionalMessage 
            });
        }
    }


    // delete photographer (Admin Only - moves to unverified instead of deleting)
    async deletePhotographer(req, res) {
        try {
            const { id } = req.params;
            const photographer = await Photographer.findById(id);
            if (!photographer) {
                return res.status(200).json({ success: false, message: "Photographer not found" });
            }

            // Message and Notification content
            const successMessage = "Photographer account successfully moved to unverified status. Data preserved.";
            const staticOtpNumbers = ["9322046187", "9325983803", "9096698947"];
            const isStatic = staticOtpNumbers.includes(photographer.mobileNumber);

            // 1. Create a notification in the database
            await Notification.create({
                photographer_id: photographer._id,
                notification_type: "account_status",
                notification_message: "Account Deactivated. Status: Unverified."
            }).catch(err => console.error("Notification failed in deletePhotographer:", err.message));

            // 2. Only update status if NOT a static number
            if (!isStatic) {
                photographer.status = "pending";
                await photographer.save();
            }

            res.status(200).json({ 
                success: true, 
                message: isStatic ? "Photographer account successfully moved to unverified status. Data preserved. (Static Protected)" : successMessage, 
                photographer 
            });
        } catch (error) {
            res.status(500).json({ success: false, message: "Failed to delete photographer", error: error.message });
        }
    }

    async updateCommissions(req, res) {
        try {
            const { initio, elite, pro } = req.body;

            // --- Commission Validation ---
            const validate = (val, name) => {
                if (val === "" || val === undefined || val === null) return `${name} cannot be empty`;
                const num = Number(val);
                if (isNaN(num)) return `${name} must be a number`;
                if (num < 0) return `${name} cannot be negative`;
                if (num > 100) return `${name} cannot more than 100`;
                return null;
            };

            const errors = [
                validate(initio, "Initio commission"),
                validate(elite, "Elite commission"),
                validate(pro, "Pro commission")
            ].filter(Boolean);

            if (errors.length > 0) {
                return res.status(400).json({ success: false, message: errors[0] });
            }
            // -----------------------------

            const updates = [];

            if (initio !== undefined) {
                updates.push(Photographer.updateMany(
                    { "professionalDetails.expertiseLevel": "INITIO" },
                    { $set: { commissionPercentage: initio } }
                ));
            }

            if (elite !== undefined) {
                updates.push(Photographer.updateMany(
                    { "professionalDetails.expertiseLevel": "ELITE" },
                    { $set: { commissionPercentage: elite } }
                ));
            }

            if (pro !== undefined) {
                updates.push(Photographer.updateMany(
                    { "professionalDetails.expertiseLevel": "PRO" },
                    { $set: { commissionPercentage: pro } }
                ));
            }

            await Promise.all(updates);

            // Update Global Settings
            await PlatformSettings.findOneAndUpdate(
                { type: "commissions" },
                {
                    $set: {
                        ...(initio !== undefined && { initio }),
                        ...(elite !== undefined && { elite }),
                        ...(pro !== undefined && { pro })
                    }
                },
                { upsert: true, new: true }
            );

            res.status(200).json({ success: true, message: "Commissions updated successfully" });
        } catch (error) {
            console.error("Error updating commissions:", error);
            res.status(500).json({ success: false, message: "Failed to update commissions", error: error.message });
        }
    }
    async getCommissions(req, res) {
        try {
            const settings = await PlatformSettings.findOne({ type: "commissions" }).lean();

            // Explicitly filter only the new fields to ignore old ones in the DB
            const commissions = settings ? {
                initio: settings.initio || 0,
                elite: settings.elite || 0,
                pro: settings.pro || 0
            } : { initio: 0, elite: 0, pro: 0 };

            res.status(200).json({
                success: true,
                commissions
            });
        } catch (error) {
            console.error("Error fetching commissions:", error);
            res.status(500).json({ success: false, message: "Failed to fetch commissions", error: error.message });
        }
    }

    async getSortedPhotographers(req, res) {
        try {
            const { bookingId } = req.query; // New Param
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.max(1, parseInt(req.query.limit) || 10);
            const skip = (page - 1) * limit;

            const pipeline = [
                { $match: { status: "active" } },
                {
                    $lookup: {
                        from: "photographerratingsgivenbyadminandusers",
                        localField: "_id",
                        foreignField: "photographerId",
                        as: "ratings"
                    }
                },
                {
                    $addFields: {
                        avgRating: { $ifNull: [{ $avg: "$ratings.rating" }, 0] },
                        // Extract category names (keys) where value is true
                        extractedCategories: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: { $objectToArray: { $ifNull: ["$servicesAndStyles.services", {}] } },
                                        as: "item",
                                        cond: { $eq: ["$$item.v", true] }
                                    }
                                },
                                as: "c",
                                in: "$$c.k"
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        "basicInfo.fullName": 1,
                        "basicInfo.profilePhoto": 1,
                        "professionalDetails.expertiseLevel": 1,
                        "servicesAndStyles.services": 1,
                        commissionPercentage: 1,
                        avgRating: 1,
                        categories: { $ifNull: ["$extractedCategories", []] },
                        createdAt: 1
                    }
                }
            ];

            const [photographersAgg, settings] = await Promise.all([
                Photographer.aggregate(pipeline),
                PlatformSettings.findOne({ type: "commissions" })
            ]);

            const globalCommissions = settings || { initio: 0, elite: 0, pro: 0 };
            const levelOrder = { "INITIO": 1, "ELITE": 2, "PRO": 3 };

            // Fetch booking assignment details if bookingId is provided
            let assignedPhotographerId = null;
            let bookingStatus = null;
            if (bookingId) {
                const booking = await ServiceBooking.findById(bookingId)
                    .select("photographer_id bookingStatus status");
                if (booking) {
                    // Only treat as assigned if booking is NOT canceled
                    if (booking.status !== "canceled") {
                        assignedPhotographerId = booking.photographer_id?.toString();
                        bookingStatus = booking.bookingStatus;
                    }
                }
            }

            // --- Custom Sort Logic for priority ---
            let sortedPhotographers = photographersAgg;
            if (assignedPhotographerId && bookingStatus === "accepted") {
                sortedPhotographers = photographersAgg.sort((a, b) => {
                    const isAssignedA = a._id.toString() === assignedPhotographerId;
                    const isAssignedB = b._id.toString() === assignedPhotographerId;
                    if (isAssignedA) return -1;
                    if (isAssignedB) return 1;

                    const levelA = levelOrder[a.professionalDetails?.expertiseLevel] || 99;
                    const levelB = levelOrder[b.professionalDetails?.expertiseLevel] || 99;
                    return levelA - levelB || b.createdAt - a.createdAt;
                });
            } else {
                sortedPhotographers = photographersAgg.sort((a, b) => {
                    const levelA = levelOrder[a.professionalDetails?.expertiseLevel] || 99;
                    const levelB = levelOrder[b.professionalDetails?.expertiseLevel] || 99;
                    return levelA - levelB || b.createdAt - a.createdAt;
                });
            }

            const total = sortedPhotographers.length;
            const paginatedItems = sortedPhotographers.slice(skip, skip + limit);

            const result = paginatedItems.map(p => {
                const level = p.professionalDetails?.expertiseLevel || "N/A";
                let comm = p.commissionPercentage;

                if (!comm) {
                    if (level === "INITIO") comm = globalCommissions.initio;
                    else if (level === "ELITE") comm = globalCommissions.elite;
                    else if (level === "PRO") comm = globalCommissions.pro;
                }

                const baseUrl = `${req.protocol}://${req.get("host")}`;
                let photo = p.basicInfo?.profilePhoto || "";
                if (photo && !photo.startsWith("http")) {
                    photo = `${baseUrl}/${photo.replace(/\\/g, "/").replace(/^\//, "")}`;
                }

                return {
                    _id: p._id,
                    name: p.basicInfo?.fullName || "N/A",
                    level: level,
                    profilePhoto: photo,
                    commissionPercentage: comm || 0,
                    avgRating: parseFloat((p.avgRating || 0).toFixed(1)),
                    categories: p.categories || [],
                    isAssigned: assignedPhotographerId === p._id.toString() && bookingStatus === "accepted"
                };
            });

            const isLock = assignedPhotographerId !== null && bookingStatus === "accepted";
            let finalData = result;
            let finalTotal = total;

            if (isLock) {
                finalData = result.filter(p => p.isAssigned);
                finalTotal = finalData.length;
            }

            res.status(200).json({
                success: true,
                isLock: isLock,
                data: finalData,
                meta: { total: finalTotal, page, limit }
            });
        } catch (error) {
            console.error("Error fetching sorted photographers:", error);
            res.status(500).json({ success: false, message: "Failed to fetch photographers", error: error.message });
        }
    }

    // Sort photographers based on categories, expertise, and rating
    async getSortPhotographers(req, res) {
        try {
            const { category, expertise, sortBy, rating, bookingId } = req.query; // sortBy can be 'rating', 'expertise', 'category'
            const minRating = parseFloat(rating) || 0;
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.max(1, parseInt(req.query.limit) || 10);
            const skip = (page - 1) * limit;

            const pipeline = [];

            // 1. Match active photographers
            pipeline.push({ $match: { status: "active" } });

            // 2. Lookup Ratings for average rating (needed early for OR filtering)
            pipeline.push({
                $lookup: {
                    from: "photographerratingsgivenbyadminandusers",
                    localField: "_id",
                    foreignField: "photographerId",
                    as: "allRatings"
                }
            });

            // 3. Calculate fields (avgRating, categoryCount, expertiseScore)
            pipeline.push({
                $addFields: {
                    avgRating: { $ifNull: [{ $avg: "$allRatings.rating" }, 0] },
                    categoryCount: {
                        $size: {
                            $filter: {
                                input: { $objectToArray: { $ifNull: ["$servicesAndStyles.services", {}] } },
                                as: "item",
                                cond: { $eq: ["$$item.v", true] }
                            }
                        }
                    },
                    expertiseScore: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$professionalDetails.expertiseLevel", "PRO"] }, then: 3 },
                                { case: { $eq: ["$professionalDetails.expertiseLevel", "ELITE"] }, then: 2 },
                                { case: { $eq: ["$professionalDetails.expertiseLevel", "INITIO"] }, then: 1 }
                            ],
                            default: 0
                        }
                    }
                }
            });

            // 4. Build OR Filter array
            const orFilters = [];

            if (category && category.trim() !== "") {
                const categoryField = `servicesAndStyles.services.${category}`;
                orFilters.push({ [categoryField]: true });
            }

            if (expertise && expertise.trim() !== "") {
                orFilters.push({ "professionalDetails.expertiseLevel": expertise.toUpperCase() });
            }

            if (rating !== undefined && rating !== null && rating.toString().trim() !== "") {
                orFilters.push({ avgRating: { $lte: minRating } });
            }

            // Apply OR filters as requested (matching ANY provided criteria)
            if (orFilters.length > 0) {
                pipeline.push({ $match: { $or: orFilters } });
            }

            // 8. Apply Sorting
            let sortStage = {};
            if (sortBy === 'rating') {
                sortStage = { avgRating: -1, expertiseScore: -1 };
            } else if (sortBy === 'expertise') {
                sortStage = { expertiseScore: -1, avgRating: -1 };
            } else if (sortBy === 'category') {
                sortStage = { categoryCount: -1, expertiseScore: -1 };
            } else {
                // Default sort: Rating then Expertise
                sortStage = { avgRating: -1, expertiseScore: -1, createdAt: -1 };
            }

            // --- Priority Priority Sorting for Assigned Photographer ---
            if (bookingId) {
                const booking = await ServiceBooking.findById(bookingId).select("photographer_id bookingStatus status");
                if (booking && booking.bookingStatus === "accepted" && booking.status !== "canceled") {
                    pipeline.push({
                        $addFields: {
                            assignedPriority: { $eq: ["$_id", booking.photographer_id] }
                        }
                    });
                    sortStage = { assignedPriority: -1, ...sortStage };
                }
            }

            pipeline.push({ $sort: sortStage });

            // 9. Pagination Facet
            pipeline.push({
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [{ $skip: skip }, { $limit: limit }]
                }
            });

            const [results] = await Photographer.aggregate(pipeline);

            // Fetch booking assignment details if bookingId is provided
            let assignedPhotographerId = null;
            let bookingStatus = null;
            if (bookingId) {
                const booking = await ServiceBooking.findById(bookingId).select("photographer_id bookingStatus status");
                if (booking && booking.status !== "canceled") {
                    assignedPhotographerId = booking.photographer_id?.toString();
                    bookingStatus = booking.bookingStatus;
                }
            }

            const total = results.metadata[0]?.total || 0;
            const photographers = results.data.map(p => {
                const transformed = this._transformPhotographerData(p, req);
                return {
                    ...transformed,
                    avgRating: parseFloat((p.avgRating || 0).toFixed(1)),
                    expertiseScore: p.expertiseScore || 0,
                    categoryCount: p.categoryCount || 0,
                    isAssigned: assignedPhotographerId === p._id.toString() && bookingStatus === "accepted"
                };
            });

            const isLock = assignedPhotographerId !== null && bookingStatus === "accepted";
            let finalPhotographers = photographers;
            let finalTotal = total;

            if (isLock) {
                finalPhotographers = photographers.filter(p => p.isAssigned);
                finalTotal = finalPhotographers.length;
            }

            res.status(200).json({
                success: true,
                isLock: isLock,
                message: "Photographers filtered and sorted successfully",
                data: finalPhotographers,
                meta: {
                    total: finalTotal,
                    page,
                    limit,
                    totalPages: Math.ceil(finalTotal / limit)
                }
            });

        } catch (error) {
            console.error("Error in getSortPhotographers:", error);
            res.status(500).json({
                success: false,
                message: "Failed to sort photographers",
                error: error.message
            });
        }
    }

    // Delete Account (moves to unverified status instead of deleting)
    async deleteAccount(req, res) {
        try {
            // Priority: Auth User ID (Self, 'id' from token) -> Auth Photographer ID
            const id = req.user?.id || req.user?._id || req.photographer?._id;

            if (!id) {
                return res.status(400).json({ success: false, message: "Photographer ID required" });
            }

            const photographer = await Photographer.findById(id);
            if (!photographer) {
                return res.status(404).json({ success: false, message: "Photographer not found" });
            }

            // Message and Notification content
            const successMessage = "Account deactivated and moved to unverified status successfully";
            const staticOtpNumbers = ["9322046187", "9325983803", "9096698947"];
            const isStatic = staticOtpNumbers.includes(photographer.mobileNumber);

            // 1. Create a notification in the database
            await Notification.create({
                photographer_id: photographer._id,
                notification_type: "account_status",
                notification_message: "Account Deactivated. Per your request."
            }).catch(err => console.error("Notification failed in deleteAccount:", err.message));

            // 2. Only update status if NOT a static number
            if (!isStatic) {
                photographer.status = "pending";
                await photographer.save();
            }

            res.status(200).json({
                success: true,
                message: isStatic ? "Account deactivated successfully (Static Protected)" : successMessage,
            });
        } catch (error) {
            res.status(500).json({ success: false, message: "Failed to delete account", error: error.message });
        }
    }
}

export default new PhotographerController();