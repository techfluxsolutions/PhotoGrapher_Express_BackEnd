import PartnerRegistration from "../models/PartnerRegistration.mjs";

class PartnerRegistrationController {
    // Create a new registration (User side)
    async create(req, res, next) {
        try {
            const registration = await PartnerRegistration.create(req.body);
            return res.status(201).json({
                success: true,
                message: "Registration submitted successfully",
                data: registration,
            });
        } catch (error) {
            if (error.name === "ValidationError") {
                const formattedErrors = Object.values(error.errors).map((err) => ({
                    field: err.path,
                    message: err.message,
                }));
                return res.status(400).json({
                    success: false,
                    message: formattedErrors[0].message,
                    errors: formattedErrors,
                });
            }
            // Handle duplicate key error
            if (error.code === 11000) {
                const field = Object.keys(error.keyValue)[0];
                return res.status(400).json({
                    success: false,
                    message: `${field} already exists`,
                    errors: [
                        {
                            field: field,
                            message: `${field} already exists`,
                        },
                    ],
                });
            }
            next(error);
        }
    }

    // Get all registrations (Admin side)
    async getAll(req, res, next) {
        try {
            const registrations = await PartnerRegistration.find().sort({ createdAt: -1 });
            return res.status(200).json({
                success: true,
                count: registrations.length,
                data: registrations,
            });
        } catch (error) {
            next(error);
        }
    }

    // Get single registration by ID
    async getById(req, res, next) {
        try {
            const registration = await PartnerRegistration.findById(req.params.id);
            if (!registration) {
                return res.status(404).json({
                    success: false,
                    message: "Registration not found",
                });
            }
            return res.status(200).json({
                success: true,
                data: registration,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new PartnerRegistrationController();
