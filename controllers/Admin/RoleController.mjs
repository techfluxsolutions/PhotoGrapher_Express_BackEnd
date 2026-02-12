
import Role from '../../models/Role.mjs';

import AdminEmailAuth from '../../models/AdminEmailAuth.mjs';
import bcrypt from 'bcrypt';

class RoleController {
    async create(req, res, next) {
        try {
            const { roleName, description, permissions, email, password } = req.body;

            if (!roleName) {
                return res.status(400).json({
                    success: false,
                    message: "Role name is required"
                });
            }

            // Check for duplicate role name
            const existingRole = await Role.findOne({ roleName });
            if (existingRole) {
                return res.status(400).json({
                    success: false,
                    message: "Role name already exists"
                });
            }

            // Validate permissions
            if (permissions && permissions.length > 0) {
                const validPermissions = [
                    'Dashboard', 'Photographers', 'Customers', 'Bookings', 'Payments',
                    'Services', 'Quotes', 'Commission', 'Subscribers', 'Roles', 'Disputes'
                ];
                const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
                if (invalidPermissions.length > 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid permissions: ${invalidPermissions.join(', ')}`
                    });
                }
            }

            const newRole = await Role.create({
                roleName,
                description,
                permissions: permissions || []
            });

            // If email and password provided, create a new admin user with this role
            let newAdmin = null;
            if (email && password) {
                // Check if admin email already exists
                const existingAdmin = await AdminEmailAuth.findOne({ email });
                if (existingAdmin) {
                    return res.status(400).json({
                        success: false,
                        message: "Admin email already exists"
                    });
                }

                const hashedPassword = await bcrypt.hash(password, 10);

                newAdmin = await AdminEmailAuth.create({
                    email,
                    password: hashedPassword,
                    role: newRole._id,
                    permissions: newRole.permissions, // Copy permissions to user for quick access if needed
                    isActive: true
                });
            }

            res.status(201).json({
                success: true,
                message: "Role created successfully",
                data: {
                    role: newRole,
                    admin: newAdmin
                }
            });
        } catch (error) {
            if (error.code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: "Duplicate key error"
                });
            }
            next(error);
        }
    }

    async getAll(req, res, next) {
        try {
            const roles = await Role.find();
            res.status(200).json({
                success: true,
                data: roles
            });
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const role = await Role.findById(id);
            if (!role) {
                return res.status(404).json({
                    success: false,
                    message: "Role not found"
                });
            }
            res.status(200).json({
                success: true,
                data: role
            });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { roleName, description, permissions } = req.body;

            const updatedRole = await Role.findByIdAndUpdate(
                id,
                { roleName, description, permissions },
                { new: true, runValidators: true }
            );

            if (!updatedRole) {
                return res.status(404).json({
                    success: false,
                    message: "Role not found"
                });
            }

            res.status(200).json({
                success: true,
                message: "Role updated successfully",
                data: updatedRole
            });
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const deletedRole = await Role.findByIdAndDelete(id);

            if (!deletedRole) {
                return res.status(404).json({
                    success: false,
                    message: "Role not found"
                });
            }

            res.status(200).json({
                success: true,
                message: "Role deleted successfully"
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new RoleController();
