import Photographer from "../../models/Photographer.mjs";
import PlatformSettings from "../../models/PlatformSettings.mjs";
import bcrypt from "bcrypt";

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
                .select('basicInfo.fullName email mobileNumber professionalDetails.yearsOfExperience professionalDetails.primaryLocation professionalDetails.startUpDate status createdAt commissionPercentage')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });

            const total = await Photographer.countDocuments(query);

            // Transform response
            const transformedItems = items.map(p => this._transformPhotographerData(p));

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
    _transformPhotographerData(p) {
        const date = new Date(p.createdAt);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        let verificationStatus = "Inactive";
        if (p.status === 'active') verificationStatus = "Verified";
        if (p.status === 'pending') verificationStatus = "Unverified";

        return {
            _id: p._id,
            name: p.basicInfo?.fullName,
            email: p.email,
            phone: p.mobileNumber,
            experience: p.professionalDetails?.yearsOfExperience,
            city: p.professionalDetails?.primaryLocation,
            status: p.status,
            verificationStatus: verificationStatus,
            createdAt: p.createdAt,
            signUpDate: p.professionalDetails?.startUpDate || `${day}/${month}/${year}`,
            commissionPercentage: p.commissionPercentage || 0
        };
    }

    // get photographer by id (Supports Admin/Public via :id, or Self via Auth)
    async getPhotographerById(req, res) {
        try {
            // Priority: Params ID (Admin/Public) -> Auth User ID (Self, 'id' from token) -> Auth Photographer ID
            const id = req.params.id || req.user?.id || req.user?._id || req.photographer?._id;

            if (!id) {
                return res.status(400).json({ message: "Photographer ID required" });
            }

            const photographer = await Photographer.findById(id);
            if (!photographer) {
                return res.status(404).json({ message: "Photographer not found" });
            }
            res.status(200).json({ success: true, message: "Photographer fetched successfully", photographer });
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
                    startUpDate: startUpDate || signUpDate
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
            res.status(500).json({ message: "Failed to add unverified photographer", error: error.message });
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

            // Handle password update if present
            if (updateData.password) {
                const salt = await bcrypt.genSalt(10);
                updateData.password = await bcrypt.hash(updateData.password, salt);
            }

            // Handle Profile Photo Upload
            if (req.file) {
                // Ensure basicInfo is an object
                if (typeof updateData.basicInfo === 'string') {
                    try {
                        updateData.basicInfo = JSON.parse(updateData.basicInfo);
                    } catch (e) {
                        updateData.basicInfo = {};
                    }
                } else if (!updateData.basicInfo) {
                    updateData.basicInfo = {};
                }

                // Merge profilePhoto into basicInfo
                updateData.basicInfo = {
                    ...updateData.basicInfo,
                    profilePhoto: `/uploads/${req.file.filename}`
                };
            }

            // Parse Schema Fields if they are JSON strings (from FormData)
            const jsonFields = [
                'basicInfo',
                'professionalDetails',
                'servicesAndStyles',
                'availability',
                'pricing',
                'photographyAccessories',
                'bank_details' // keys like bank_name are top level but just in case user nested them? 
                // Actually schema has flat bank (bank_name etc) and nested (basicInfo etc)
                // Only nested arrays/objects need parsing.
            ];

            // Add fields that are definitely objects/arrays in Schema
            // function to try parse
            const tryParse = (key) => {
                if (updateData[key] && typeof updateData[key] === 'string') {
                    try {
                        updateData[key] = JSON.parse(updateData[key]);
                    } catch (e) {
                        // console.error(`Failed to parse ${key}`, e);
                    }
                }
            };

            tryParse('basicInfo');
            tryParse('professionalDetails');
            tryParse('servicesAndStyles');
            tryParse('availability');
            tryParse('pricing');
            tryParse('photographyAccessories');

            const photographer = await Photographer.findByIdAndUpdate(id, updateData, {
                new: true,
                runValidators: true
            });

            if (!photographer) {
                return res.status(200).json({ message: "Photographer not found" });
            }
            res.status(200).json({ message: "Photographer updated successfully", photographer });
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

            res.status(200).json({ message: "Commissions updated successfully" });
        } catch (error) {
            console.error("Error updating commissions:", error);
            res.status(500).json({ message: "Failed to update commissions", error: error.message });
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
            res.status(500).json({ message: "Failed to fetch commissions", error: error.message });
        }
    }
}

export default new PhotographerController();
