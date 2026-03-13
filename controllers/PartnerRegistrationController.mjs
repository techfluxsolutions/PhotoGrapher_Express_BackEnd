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

    // Get all registrations (with pagination)
    async getAll(req, res, next) {
        try {
            const { page = 1, limit = 10, emailId, phoneNumber } = req.query;
            const filter = {};
            if (emailId) filter.emailId = emailId;
            if (phoneNumber) filter.phoneNumber = phoneNumber;

            const pageNumber = parseInt(page, 10);
            const limitNumber = parseInt(limit, 10);
            const skip = (pageNumber - 1) * limitNumber;

            const [registrations, total] = await Promise.all([
                PartnerRegistration.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNumber),
                PartnerRegistration.countDocuments(filter),
            ]);

            return res.status(200).json({
                success: true,
                message: "Partner registrations retrieved successfully",
                data: registrations,
                pagination: {
                    totalRecords: total,
                    currentPage: pageNumber,
                    totalPages: Math.ceil(total / limitNumber),
                    limit: limitNumber,
                },
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
                message: "Partner registration retrieved successfully",
                data: registration,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new PartnerRegistrationController();
