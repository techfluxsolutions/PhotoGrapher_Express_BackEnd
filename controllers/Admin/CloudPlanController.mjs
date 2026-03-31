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
            const cloudPlans = await CloudPlans.find();
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
