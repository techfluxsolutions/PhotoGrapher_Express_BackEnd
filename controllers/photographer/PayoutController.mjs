import Payout from "../../models/Payout.mjs";
import Job from "../../models/Job.mjs";
// import Photographer from "../../models/Photographer.mjs"; // Unused currently but might be useful

class PayoutController {
    // Get all payouts for the authenticated photographer
    async getAll(req, res, next) {
        try {
            // Assuming req.photographer.id is populated by middleware
            // If not, we might need to adjust based on how auth is handled (req.user or req.photographer)
            // Based on photographerRoutes.mjs, it uses 'isPhotographer' middleware, likely setting req.photographer or req.user
            const photographerId = req.user?._id || req.photographer?._id;

            if (!photographerId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            // Populate details to match the requested view (Client Name, Event Type, etc.)
            const payouts = await Payout.find({ photographer_id: photographerId })
                .populate({
                    path: "job_id",
                    select: "job_name event_type date_time customer_id",
                    populate: {
                        path: "customer_id",
                        select: "username email" // Getting client name (username as fallback)
                    }
                })
                .sort({ createdAt: -1 });

            res.status(200).json({ success: true, data: payouts });
        } catch (error) {
            next(error);
        }
    }

    // Get a single payout by ID
    async getOne(req, res, next) {
        try {
            const { id } = req.params;
            const payout = await Payout.findById(id)
                .populate({
                    path: "job_id",
                    select: "job_name event_type date_time customer_id",
                    populate: {
                        path: "customer_id",
                        select: "username email"
                    }
                });

            if (!payout) {
                return res.status(404).json({ success: false, message: "Payout not found" });
            }

            res.status(200).json({ success: true, data: payout });
        } catch (error) {
            next(error);
        }
    }

    // Create a new payout record (Manually, if needed, or trigger based)
    async create(req, res, next) {
        try {
            const { job_id, total_amount, paid_amount, status } = req.body;
            const photographerId = req.user?._id || req.photographer?._id;

            if (!photographerId) {
                return res.status(401).json({ success: false, message: "Unauthorized" });
            }

            // Check if job exists and belongs to photographer (optional security check)
            const job = await Job.findById(job_id);
            if (!job) {
                return res.status(404).json({ success: false, message: "Job not found" });
            }

            // Calculate pending
            const pending_amount = total_amount - (paid_amount || 0);

            const newPayout = await Payout.create({
                photographer_id: photographerId,
                job_id,
                total_amount,
                paid_amount,
                pending_amount,
                status,
                payout_date: new Date()
            });

            res.status(201).json({ success: true, data: newPayout });
        } catch (error) {
            // Handle duplicate key error for unique compound index
            if (error.code === 11000) {
                return res.status(400).json({ success: false, message: "Payout record already exists for this job" });
            }
            next(error);
        }
    }

    // Update payout (e.g., adding a payment)
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { paid_amount, status } = req.body;

            // Find first to recalculate pending
            const payout = await Payout.findById(id);
            if (!payout) {
                return res.status(404).json({ success: false, message: "Payout not found" });
            }

            // Update fields if provided
            if (paid_amount !== undefined) {
                payout.paid_amount = paid_amount;
                payout.pending_amount = payout.total_amount - paid_amount;
            }
            if (status) payout.status = status;

            await payout.save();

            res.status(200).json({ success: true, data: payout });
        } catch (error) {
            next(error);
        }
    }

    // Delete payout
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const payout = await Payout.findByIdAndDelete(id);

            if (!payout) {
                return res.status(404).json({ success: false, message: "Payout not found" });
            }

            res.status(200).json({ success: true, message: "Payout deleted successfully" });
        } catch (error) {
            next(error);
        }
    }
}

export default new PayoutController();
