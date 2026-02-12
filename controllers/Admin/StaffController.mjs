
import AdminEmailAuth from '../../models/AdminEmailAuth.mjs';
import Admin from '../../models/Admin.mjs';
import Role from '../../models/Role.mjs';
import bcrypt from 'bcrypt';
import { sendErrorResponse, sendSuccessResponse } from '../../utils/handleResponce.mjs';

class StaffController {
    /**
     * Create a new staff member
     * POST /api/admins/staff
     */
    async create(req, res, next) {
        try {
            const { name, email, password, roleId } = req.body;

            // 1. Validation
            if (!name || !email || !password || !roleId) {
                return sendErrorResponse(res, "Name, email, password, and role are required", 400);
            }

            // 2. Check if role exists
            const role = await Role.findById(roleId);
            if (!role) {
                return sendErrorResponse(res, "Role not found", 404);
            }

            // 3. Check if email exists in AdminEmailAuth or Admin
            const existingAuth = await AdminEmailAuth.findOne({ email });
            if (existingAuth) {
                return sendErrorResponse(res, "Email already exists (Auth)", 200);
            }

            const existingProfile = await Admin.findOne({ email });
            if (existingProfile) {
                return sendErrorResponse(res, "Email already exists (Profile)", 200);
            }

            // Check if username/name taken
            const existingUsername = await Admin.findOne({ username: name });
            if (existingUsername) {
                return sendErrorResponse(res, "Name/Username is already taken", 200);
            }

            // 4. Hash Password
            const hashedPassword = await bcrypt.hash(password, 10);

            // 5. Create Auth Record
            const newAuth = await AdminEmailAuth.create({
                email,
                password: hashedPassword,
                role: roleId,
                permissions: role.permissions, // Inherit permissions from role
                isActive: true,
                createdBy: req.user ? req.user.id : null
            });

            // 6. Create Profile Record
            try {
                // Find creator's Admin profile ID if logged in
                let creatorProfileId = null;
                if (req.user && req.user.email) {
                    const creatorProfile = await Admin.findOne({ email: req.user.email });
                    if (creatorProfile) creatorProfileId = creatorProfile._id;
                }

                const newProfile = await Admin.create({
                    username: name,
                    email,
                    isAdmin: true,
                    adminType: 'admin', // Default to normal admin/staff
                    createdBy: creatorProfileId,
                    status: 'active'
                });

                return sendSuccessResponse(res, {
                    staff: {
                        _id: newProfile._id,
                        name: newProfile.username,
                        email: newProfile.email,
                        role: role.roleName,
                        roleId: role._id,
                        status: newProfile.status
                    }
                }, "Staff member created successfully", 201);

            } catch (profileError) {
                // Rollback auth creation if profile fails
                await AdminEmailAuth.findByIdAndDelete(newAuth._id);
                throw profileError;
            }

        } catch (error) {
            console.error("Create Staff Error:", error);
            return sendErrorResponse(res, error.message, 500);
        }
    }

    /**
     * Get all staff members
     * GET /api/admins/staff
     */
    async getAll(req, res, next) {
        try {
            // Fetch all admins who are NOT super_admin (assuming staff are 'admin' type)
            // Or fetch based on having a role assigned in Auth?
            // The request is likely for the Admin profiles list, but enhanced with Role info.

            // Let's fetch Admin profiles
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const total = await Admin.countDocuments({ adminType: { $ne: 'super_admin' } });

            const staffProfiles = await Admin.find({ adminType: { $ne: 'super_admin' } })
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 });

            // Enhance with Role info from AdminEmailAuth
            const enhancedStaff = await Promise.all(staffProfiles.map(async (profile) => {
                const auth = await AdminEmailAuth.findOne({ email: profile.email }).populate('role');
                return {
                    _id: profile._id,
                    name: profile.username,
                    email: profile.email,
                    mobileNumber: profile.mobileNumber,
                    status: profile.status,
                    role: auth?.role?.roleName || 'No Role',
                    roleId: auth?.role?._id,
                    lastLogin: auth?.lastLogin,
                    createdAt: profile.createdAt
                };
            }));

            return res.status(200).json({
                success: true,
                message: "Staff list fetched successfully",
                data: enhancedStaff,
                meta: {
                    total,
                    page,
                    limit
                }
            });
        } catch (error) {
            return sendErrorResponse(res, error.message, 500);
        }
    }

    /**
     * Delete staff member
     * DELETE /api/admins/staff/:id
     */
    async delete(req, res, next) {
        try {
            const { id } = req.params;

            // Find profile to get email
            const profile = await Admin.findById(id);
            if (!profile) {
                return sendErrorResponse(res, "Staff member not found", 404);
            }

            // Delete Auth record
            await AdminEmailAuth.findOneAndDelete({ email: profile.email });

            // Delete Profile record
            await Admin.findByIdAndDelete(id);

            return sendSuccessResponse(res, null, "Staff member deleted successfully", 200);
        } catch (error) {
            return sendErrorResponse(res, error.message, 500);
        }
    }

    /**
     * Get single staff member by ID
     * GET /api/admins/staff/:id
     */
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const profile = await Admin.findById(id);

            if (!profile) {
                return sendErrorResponse(res, "Staff member not found", 404);
            }

            const auth = await AdminEmailAuth.findOne({ email: profile.email }).populate('role');

            const staffData = {
                _id: profile._id,
                name: profile.username,
                email: profile.email,
                mobileNumber: profile.mobileNumber,
                status: profile.status,
                role: auth?.role?.roleName || 'No Role',
                roleId: auth?.role?._id,
                lastLogin: auth?.lastLogin,
                createdAt: profile.createdAt
            };

            return sendSuccessResponse(res, staffData, "Staff details fetched successfully", 200);
        } catch (error) {
            return sendErrorResponse(res, error.message, 500);
        }
    }

    /**
     * Update staff member
     * PUT /api/admins/staff/:id
     */
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { name, email, password, roleId, status } = req.body;

            // Find existing profile
            const profile = await Admin.findById(id);
            if (!profile) {
                return sendErrorResponse(res, "Staff member not found", 404);
            }

            // Find existing auth
            const auth = await AdminEmailAuth.findOne({ email: profile.email });
            if (!auth) {
                return sendErrorResponse(res, "Staff auth record not found", 404);
            }

            // Check if email is changing and if it's already taken
            if (email && email !== profile.email) {
                const existingAuth = await AdminEmailAuth.findOne({ email });
                if (existingAuth) return sendErrorResponse(res, "Email already exists", 400);

                const existingProfile = await Admin.findOne({ email });
                if (existingProfile) return sendErrorResponse(res, "Email already exists", 400);

                // Update email in both records
                profile.email = email;
                auth.email = email;
            }

            // Update Profile Fields
            if (name) profile.username = name;
            if (status && ["active", "inactive"].includes(status)) profile.status = status;

            await profile.save();

            // Update Auth Fields
            if (password) {
                auth.password = await bcrypt.hash(password, 10);
            }
            if (roleId) {
                const role = await Role.findById(roleId);
                if (!role) return sendErrorResponse(res, "Role not found", 404);
                auth.role = roleId;
                auth.permissions = role.permissions;
            }

            // Sync active status with auth if needed, though status is mainly on profile
            if (status) {
                auth.isActive = status === 'active';
            }

            await auth.save();

            // Return updated data
            const updatedRole = await Role.findById(auth.role);
            return sendSuccessResponse(res, {
                _id: profile._id,
                name: profile.username,
                email: profile.email,
                role: updatedRole?.roleName,
                roleId: updatedRole?._id,
                status: profile.status
            }, "Staff updated successfully", 200);

        } catch (error) {
            return sendErrorResponse(res, error.message, 500);
        }
    }
}

export default new StaffController();
