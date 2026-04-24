import EditingPlan from "../../models/EditingPlan.mjs";

class EditingController {
    async create(req, res) {
        try {
            const { planName, subtitle, numberOfVideos, price, features, planCategory } = req.body;
            const editingPlan = new EditingPlan({ planName, subtitle, numberOfVideos, price, features, planCategory });
            await editingPlan.save();
            res.status(201).json({ success: true, message: "Editing plan created successfully", editingPlan });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getAll(req, res) {
        try {
            const { planCategory } = req.query;
            const filter = {};
            if (planCategory) {
                filter.planCategory = planCategory;
            }
            const editingPlans = await EditingPlan.find(filter);
            if (!editingPlans) {
                return res.status(404).json({ success: false, message: "Editing plans not found" });
            }
            res.status(200).json({ success: true, message: "Editing plans fetched successfully", editingPlans });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getStandardPlans(req, res) {
        try {
            const editingPlans = await EditingPlan.find({ planCategory: "standard" });
            res.status(200).json({ success: true, message: "Standard editing plans fetched successfully", editingPlans });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getPremiumPlans(req, res) {
        try {
            const editingPlans = await EditingPlan.find({ planCategory: "premium" });
            res.status(200).json({ success: true, message: "Premium editing plans fetched successfully", editingPlans });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getById(req, res) {
        try {
            const editingPlan = await EditingPlan.findById(req.params.id);
            if (!editingPlan) {
                return res.status(404).json({ success: false, message: "Editing plan not found" });
            }
            res.status(200).json({ success: true, message: "Editing plan fetched successfully", editingPlan });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async update(req, res) {
        try {
            const { planName, subtitle, numberOfVideos, price, features, planCategory } = req.body;
            const editingPlan = await EditingPlan.findByIdAndUpdate(req.params.id, { planName, subtitle, numberOfVideos, price, features, planCategory }, { new: true });
            if (!editingPlan) {
                return res.status(404).json({ success: false, message: "Editing plan not found" });
            }
            res.status(200).json({ success: true, message: "Editing plan updated successfully", editingPlan });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async delete(req, res) {
        try {
            const editingPlan = await EditingPlan.findByIdAndDelete(req.params.id);
            if (!editingPlan) {
                return res.status(404).json({ success: false, message: "Editing plan not found" });
            }
            res.status(200).json({ success: true, message: "Editing plan deleted successfully" });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }


}

export default new EditingController();