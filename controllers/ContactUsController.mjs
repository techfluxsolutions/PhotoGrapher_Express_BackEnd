import ContactUs from "../models/ContactUs.mjs";

class ContactUsController {
    // Create a new contact submission (User side)
    async create(req, res, next) {
        try {
            const submission = await ContactUs.create(req.body);
            return res.status(201).json({
                success: true,
                message: "Your message has been sent successfully",
                data: submission,
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

    // Get all contact submissions (with pagination)
    async getAll(req, res, next) {
        try {
            const { page = 1, limit = 10, emailId, phoneNumber } = req.query;
            const filter = {};
            if (emailId) filter.emailId = emailId;
            if (phoneNumber) filter.phoneNumber = phoneNumber;

            const pageNumber = parseInt(page, 10);
            const limitNumber = parseInt(limit, 10);
            const skip = (pageNumber - 1) * limitNumber;

            const [submissions, total] = await Promise.all([
                ContactUs.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNumber),
                ContactUs.countDocuments(filter),
            ]);

            return res.status(200).json({
                success: true,
                message: "Contact submissions retrieved successfully",
                
                data: submissions,
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

    // Get single contact submission by ID
    async getById(req, res, next) {
        try {
            const submission = await ContactUs.findById(req.params.id);
            if (!submission) {
                return res.status(404).json({
                    success: false,
                    message: "Contact submission not found",
                });
            }
            return res.status(200).json({
                success: true,
                message: "Contact submission retrieved successfully",
                data: submission,
            });
        } catch (error) {
            next(error);
        }
    }

    // Delete a submission (Admin side)
    async delete(req, res, next) {
        try {
            const submission = await ContactUs.findByIdAndDelete(req.params.id);
            if (!submission) {
                return res.status(404).json({
                    success: false,
                    message: "Contact submission not found",
                });
            }
            return res.status(200).json({
                success: true,
                message: "Contact submission deleted successfully",
            });
        } catch (error) {
            next(error);
        }
    }

    
}

export default new ContactUsController();
