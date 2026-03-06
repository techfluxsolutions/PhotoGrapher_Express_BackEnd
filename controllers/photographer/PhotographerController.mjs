import Photographer from "../../models/Photographer.mjs";
import PlatformSettings from "../../models/PlatformSettings.mjs";
import bcrypt from "bcrypt";
import { sendWelcomeEmail } from "../../utils/emailService.mjs";
import mongoose from "mongoose";

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
                .select('basicInfo.fullName basicInfo.profilePhoto email mobileNumber professionalDetails.yearsOfExperience professionalDetails.primaryLocation professionalDetails.startUpDate professionalDetails.team_studio status createdAt commissionPercentage')
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
            profilePhoto = `${baseUrl}${profilePhoto}`;
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
            team_studio: p.professionalDetails?.team_studio || ""
        };
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
                photographerObj.basicInfo.profilePhoto = `${baseUrl}${photographerObj.basicInfo.profilePhoto}`;
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

            // Check if email already exists
            const existingUser = await Photographer.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: "Email already exists" });
            }

            // Create with status: pending
            // Mapping fields to schema structure
            const newPhotographer = new Photographer({
                username: undefined, // Optional/Sparse
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

            const photographer = await Photographer.findById(id);

            if (!photographer) {
                return res.status(404).json({ message: "Photographer not found" });
            }

            // Optional: Check if email is being changed and if it conflicts
            if (email && email !== photographer.email) {
                const existingUser = await Photographer.findOne({ email });
                if (existingUser) {
                    return res.status(400).json({ message: "Email already exists" });
                }
            }

            // Check if phone is being changed and if it conflicts
            if (phone && phone !== photographer.mobileNumber) {
                const existingUser = await Photographer.findOne({ mobileNumber: phone });
                if (existingUser) {
                    return res.status(400).json({ message: "Mobile number already exists" });
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
                message: "Unverified photographer updated successfully",
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
            res.status(500).json({ message: "Failed to update unverified photographer", error: error.message });
        }
    }

    // Verify Photographer (Password + Status Activation Only)
    async verifyPhotographer(req, res) {
        try {
            const { id } = req.params;
            const { password, confirmPassword } = req.body;

            // 1. Validation
            if (!password || !confirmPassword) {
                return res.status(400).json({ message: "Password and Confirm Password are required" });
            }

            if (password !== confirmPassword) {
                return res.status(400).json({ message: "Passwords do not match" });
            }

            // 2. Find Photographer
            const photographer = await Photographer.findById(id);
            if (!photographer) {
                return res.status(404).json({ message: "Photographer not found" });
            }

            if (photographer.status === 'active') {
                return res.status(400).json({ message: "Photographer is already verified" });
            }

            // 3. Hash Password & Set Credentials
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Set username to email as requested
            photographer.username = photographer.email;
            photographer.password = hashedPassword;
            photographer.status = "active";

            await photographer.save();

            // Send welcome email with login credentials
            // try {
            //     if (password && photographer.email) {
            //         await sendWelcomeEmail(photographer.email, photographer.username, password);
            //     }
            // } catch (emailError) {
            //     console.error("Error sending welcome email during verification:", emailError);
            // }

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

            // Update Fields
            if (profileData.basicInfo) photographer.basicInfo = { ...photographer.basicInfo, ...profileData.basicInfo };
            if (profileData.professionalDetails) photographer.professionalDetails = { ...photographer.professionalDetails, ...profileData.professionalDetails };
            if (profileData.photographyAccessories) photographer.photographyAccessories = profileData.photographyAccessories;

            if (profileData.aboutYou) photographer.aboutYou = profileData.aboutYou;

            if (profileData.servicesAndStyles) {
                photographer.servicesAndStyles = {
                    services: { ...photographer.servicesAndStyles?.services, ...profileData.servicesAndStyles?.services },
                    styles: { ...photographer.servicesAndStyles?.styles, ...profileData.servicesAndStyles?.styles }
                };
            }

            if (profileData.availability) photographer.availability = { ...photographer.availability, ...profileData.availability };
            if (profileData.pricing) photographer.pricing = { ...photographer.pricing, ...profileData.pricing };

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
                message: "Photographer profile created successfully",
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
            // Priority: Params ID (Admin) -> Auth User ID (Self, 'id' from token) -> Auth Photographer ID
            const id = req.params.id || req.user?.id || req.user?._id || req.photographer?._id;

            if (!id) {
                return res.status(400).json({ message: "Photographer ID required" });
            }

            let updateData = { ...req.body };

            // 1. Handle JSON strings from FormData for nested objects
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

            // 2. Map flat fields to nested objects (Utility for simple FormData)
            if (!updateData.basicInfo) updateData.basicInfo = {};
            if (updateData.fullName) updateData.basicInfo.fullName = updateData.fullName;
            if (updateData.displayName) updateData.basicInfo.displayName = updateData.displayName;
            if (updateData.phone) updateData.basicInfo.phone = updateData.phone;

            if (!updateData.professionalDetails) updateData.professionalDetails = {};
            if (updateData.expertiseLevel) updateData.professionalDetails.expertiseLevel = updateData.expertiseLevel;
            if (updateData.yearsOfExperience) updateData.professionalDetails.yearsOfExperience = updateData.yearsOfExperience;
            if (updateData.primaryLocation) updateData.professionalDetails.primaryLocation = updateData.primaryLocation;

            // 3. Handle Profile Photo Upload
            if (req.file) {
                const baseUrl = `${req.protocol}://${req.get("host")}`;
                updateData.basicInfo.profilePhoto = `/uploads/${req.file.filename}`;
            }

            // 4. Flatten the object for deep partial updates (Avoid overwriting whole nested objects)
            const flatten = (obj, prefix = '') => {
                let flattened = {};
                for (let key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        const newKey = prefix ? `${prefix}.${key}` : key;
                        // Only flatten objects, not arrays or special types like Date/ObjectId
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

            // Handle password update if present
            if (updateData.password) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(updateData.password, salt);
                flatUpdateData.password = hashedPassword;
            }

            const photographer = await Photographer.findByIdAndUpdate(id, { $set: flatUpdateData }, {
                new: true,
                runValidators: true
            });

            if (!photographer) {
                return res.status(200).json({ message: "Photographer not found" });
            }

            // Prepend Base URL to Photo in response
            const photographerObj = photographer.toObject();
            if (photographerObj.basicInfo?.profilePhoto && !photographerObj.basicInfo.profilePhoto.startsWith("http")) {
                const baseUrl = `${req.protocol}://${req.get("host")}`;
                photographerObj.basicInfo.profilePhoto = `${baseUrl}${photographerObj.basicInfo.profilePhoto}`;
            }

            res.status(200).json({ message: "Photographer updated successfully", photographer: photographerObj });
        } catch (error) {
            res.status(500).json({ message: "Failed to update photographer", error: error.message });
        }
    }

    // delete photographer (Admin Only)
    async deletePhotographer(req, res) {
        try {
            const { id } = req.params;
            const photographer = await Photographer.findByIdAndDelete(id);
            if (!photographer) {
                return res.status(200).json({ message: "Photographer not found" });
            }
            res.status(200).json({ success: true, message: "Photographer deleted successfully", photographer });
        } catch (error) {
            res.status(500).json({ success: false, message: "Failed to delete photographer", error: error.message });
        }
    }

    async updateCommissions(req, res) {
        try {
            const { basic, intermediate, professional } = req.body;

            const updates = [];

            if (basic !== undefined) {
                updates.push(Photographer.updateMany(
                    { "professionalDetails.expertiseLevel": "Beginner" },
                    { $set: { commissionPercentage: basic } }
                ));
            }

            if (intermediate !== undefined) {
                updates.push(Photographer.updateMany(
                    { "professionalDetails.expertiseLevel": "Intermediate" },
                    { $set: { commissionPercentage: intermediate } }
                ));
            }

            if (professional !== undefined) {
                updates.push(Photographer.updateMany(
                    { "professionalDetails.expertiseLevel": "Professional" },
                    { $set: { commissionPercentage: professional } }
                ));
            }

            await Promise.all(updates);

            // Update Global Settings
            await PlatformSettings.findOneAndUpdate(
                { type: "commissions" },
                {
                    $set: {
                        ...(basic !== undefined && { basic }),
                        ...(intermediate !== undefined && { intermediate }),
                        ...(professional !== undefined && { professional })
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
            const settings = await PlatformSettings.findOne({ type: "commissions" });
            res.status(200).json({
                success: true,
                commissions: settings || { basic: 0, intermediate: 0, professional: 0 }
            });
        } catch (error) {
            console.error("Error fetching commissions:", error);
            res.status(500).json({ success: false, message: "Failed to fetch commissions", error: error.message });
        }
    }

    async getSortedPhotographers(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.max(1, parseInt(req.query.limit) || 10);
            const skip = (page - 1) * limit;

            const [photographers, settings] = await Promise.all([
                Photographer.find({ status: "active" })
                    .select('_id basicInfo.fullName basicInfo.profilePhoto professionalDetails.expertiseLevel commissionPercentage'),
                PlatformSettings.findOne({ type: "commissions" })
            ]);

            const globalCommissions = settings || { basic: 0, intermediate: 0, professional: 0 };

            const levelOrder = {
                "Beginner": 1,
                "Intermediate": 2,
                "Professional": 3
            };

            const sorted = photographers.sort((a, b) => {
                const levelA = levelOrder[a.professionalDetails?.expertiseLevel] || 99;
                const levelB = levelOrder[b.professionalDetails?.expertiseLevel] || 99;
                return levelA - levelB || b.createdAt - a.createdAt; // Secondary sort by newest
            });

            const total = sorted.length;
            const paginatedItems = sorted.slice(skip, skip + limit);

            const result = paginatedItems.map(p => {
                const level = p.professionalDetails?.expertiseLevel || "N/A";
                let comm = p.commissionPercentage;

                // If individual commission is 0, fall back to global level-based commission
                if (!comm) {
                    if (level === "Beginner") comm = globalCommissions.basic;
                    else if (level === "Intermediate") comm = globalCommissions.intermediate;
                    else if (level === "Professional") comm = globalCommissions.professional;
                }

                const baseUrl = `${req.protocol}://${req.get("host")}`;
                let photo = p.basicInfo?.profilePhoto || "";
                if (photo && !photo.startsWith("http")) {
                    photo = `${baseUrl}${photo}`;
                }

                return {
                    id: p._id,
                    name: p.basicInfo?.fullName || "N/A",
                    level: level,
                    profilePhoto: photo,
                    commissionPercentage: comm || 0
                };
            });

            res.status(200).json({
                success: true,
                data: result,
                meta: { total, page, limit }
            });
        } catch (error) {
            console.error("Error fetching sorted photographers:", error);
            res.status(500).json({ success: false, message: "Failed to fetch photographers", error: error.message });
        }
    }
}

export default new PhotographerController();