import CloudPlans from "../../models/CloudPlans.mjs";

class CloudPlanController {
    async create(req, res, next) {
        try {
            const { charges, days } = req.body;
            const cloudPlan = new CloudPlans({ charges, days });
            await cloudPlan.save();
            res.status(201).json({ success: true, data: cloudPlan });
        } catch (error) {
            next(error);
        }
    }
    async getAll(req, res, next) {
        try {
            const query = {};
            // If not an admin, we show generic plans OR plans specifically for this client
            if (req.user && req.user.role !== "admin") {
                if (req.user.role === "user" || !req.user.role) {
                    query.$or = [
                        { client_id: req.user.id },
                        { client_id: { $exists: false } },
                        { client_id: null }
                    ];
                }
            }

            let cloudPlans = await CloudPlans.find(query).populate("booking_id");

            // Further filter for photographers (they see all generic plans + their assigned booking plans)
            if (req.user && req.user.role === "photographer") {
                cloudPlans = cloudPlans.filter(cp => {
                    // Generic plan: no booking_id or client_id
                    if (!cp.booking_id && !cp.client_id) return true;
                    
                    // Assigned to them:
                    return cp.booking_id && (
                        String(cp.booking_id.photographer_id) === String(req.user.id) ||
                        (Array.isArray(cp.booking_id.photographerIds) && cp.booking_id.photographerIds.some(id => String(id) === String(req.user.id)))
                    );
                });
            }

            res.status(200).json({ success: true, data: cloudPlans });
        } catch (error) {
            next(error);
        }
    }
    async getOne(req, res, next) {
        try {
            const { id } = req.params;
            const cloudPlan = await CloudPlans.findById(id);
            res.status(200).json({ success: true, data: cloudPlan });
        } catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const { charges, days } = req.body;
            const cloudPlan = await CloudPlans.findByIdAndUpdate(id, { charges, days }, { new: true });
            res.status(200).json({ success: true, data: cloudPlan });
        } catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const cloudPlan = await CloudPlans.findByIdAndDelete(id);
            res.status(200).json({ success: true, data: cloudPlan });
        } catch (error) {
            next(error);
        }
    }
}

export default new CloudPlanController();
