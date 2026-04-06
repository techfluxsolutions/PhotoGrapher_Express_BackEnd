import PhotographyPlan from "../../models/PhotographyPlan.mjs";

class PhotographyPlanController {
    async create(req, res) {
        try {
            const { planName, price, features, planCategory } = req.body;
            const photographyPlan = new PhotographyPlan({ planName, price, features, planCategory });
            await photographyPlan.save();
            res.status(201).json(photographyPlan);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getAll(req, res) {
        try {
            const photographyPlans = await PhotographyPlan.find();
            res.json(photographyPlans);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async getById(req, res) {
        try {
            const photographyPlan = await PhotographyPlan.findById(req.params.id);
            if (!photographyPlan) {
                return res.status(404).json({ message: "Photography plan not found" });
            }
            res.json(photographyPlan);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async update(req, res) {
        try {
            const { planName, price, features, planCategory } = req.body;
            const photographyPlan = await PhotographyPlan.findByIdAndUpdate(req.params.id, { planName, price, features, planCategory }, { new: true });
            if (!photographyPlan) {
                return res.status(404).json({ message: "Photography plan not found" });
            }
            res.json(photographyPlan);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const photographyPlan = await PhotographyPlan.findByIdAndDelete(req.params.id);
            if (!photographyPlan) {
                return res.status(404).json({ message: "Photography plan not found" });
            }
            res.json({ message: "Photography plan deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default new PhotographyPlanController();