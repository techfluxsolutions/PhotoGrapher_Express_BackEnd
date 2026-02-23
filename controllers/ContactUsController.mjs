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

    // Get all contact submissions (Admin side)
    async getAll(req, res, next) {
        try {
            const submissions = await ContactUs.find().sort({ createdAt: -1 });
            return res.status(200).json({
                success: true,
                count: submissions.length,
                data: submissions,
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
