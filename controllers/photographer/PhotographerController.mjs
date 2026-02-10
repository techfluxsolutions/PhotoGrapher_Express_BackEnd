import Photographer from "../../models/Photographer.mjs";
import bcrypt from "bcrypt";

class PhotographerController {
    // get all photographers (Admin or Public listing) - Defaults to ACTIVE/VERIFIED
    async getAllPhotographers(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.max(1, parseInt(req.query.limit) || 20);
            const skip = (page - 1) * limit;

            // Filter by status (default to active if not specified, or allowing query override)
            const query = { status: "active" };

            const items = await Photographer.find(query).skip(skip).limit(limit);
            const total = await Photographer.countDocuments(query);

            res.status(200).json({
                message: "Photographers fetched successfully",
                photographers: items,
                meta: { total, page, limit }
            });
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch photographers", error: error.message });
        }
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
            res.status(200).json({ message: "Photographer fetched successfully", photographer });
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch photographer", error: error.message });
        }
    }

    // --- Unverified / Pending Logic ---

    // Add Unverified Photographer (Status: Pending)
    async addUnverifiedPhotographer(req, res) {
        try {
            const { name, email, phone, experience, city } = req.body;

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
                    primaryLocation: city
                },
                status: "pending"
            });

            await newPhotographer.save();

            res.status(201).json({
                success: true,
                message: "Unverified photographer added successfully",
                photographer: {
                    _id: newPhotographer._id,
                    name: newPhotographer.basicInfo.fullName,
                    email: newPhotographer.email,
                    phone: newPhotographer.mobileNumber,
                    experience: newPhotographer.professionalDetails.yearsOfExperience,
                    city: newPhotographer.professionalDetails.primaryLocation,
                    status: newPhotographer.status,
                    createdAt: newPhotographer.createdAt
                }
            });

        } catch (error) {
            res.status(500).json({ message: "Failed to add unverified photographer", error: error.message });
        }
    }

    // Get Unverified Photographers
    async getUnverifiedPhotographers(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.max(1, parseInt(req.query.limit) || 20);
            const skip = (page - 1) * limit;

            const query = { status: "pending" };

            const items = await Photographer.find(query)
                .select('basicInfo.fullName email mobileNumber professionalDetails.yearsOfExperience professionalDetails.primaryLocation status createdAt')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });

            const total = await Photographer.countDocuments(query);

            // Transform to flat structure for cleaner response
            const transformedItems = items.map(p => ({
                _id: p._id,
                name: p.basicInfo?.fullName,
                email: p.email,
                phone: p.mobileNumber,
                experience: p.professionalDetails?.yearsOfExperience,
                city: p.professionalDetails?.primaryLocation,
                status: p.status,
                createdAt: p.createdAt
            }));

            res.status(200).json({
                success: true,
                photographers: transformedItems,
                meta: { total, page, limit }
            });
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch unverified photographers", error: error.message });
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

            // Handle password update if present
            if (req.body.password) {
                const salt = await bcrypt.genSalt(10);
                req.body.password = await bcrypt.hash(req.body.password, salt);
            }

            // Using findByIdAndUpdate with $set to handle updates. 
            // Since req.body might contain nested objects (basicInfo, etc.), Mongoose handles partial updates 
            // if we structure it right, or replaces the nested object if we pass the whole object.
            // For profile updates, passing the whole nested object (e.g. basicInfo) from frontend is standard.

            const photographer = await Photographer.findByIdAndUpdate(id, req.body, {
                new: true,
                runValidators: true
            });

            if (!photographer) {
                return res.status(404).json({ message: "Photographer not found" });
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
                return res.status(404).json({ message: "Photographer not found" });
            }
            res.status(200).json({ message: "Photographer deleted successfully", photographer });
        } catch (error) {
            res.status(500).json({ message: "Failed to delete photographer", error: error.message });
        }
    }
}

export default new PhotographerController();
