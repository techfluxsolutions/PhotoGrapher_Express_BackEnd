import EditingPlan from "../../models/EditingPlan.mjs";

class EditingController {
    async getAll(req, res, next) {
        try {
            const editingPlans = await EditingPlan.find();
            res.status(200).json({ success: true, data: editingPlans });
        } catch (error) {
            next(error);
        }
    }
    async getOne(req, res, next) {
        try {
            const { id } = req.params;
            const editingPlan = await EditingPlan.findById(id);
            if (!editingPlan) return res.status(404).json({ success: false, message: "Editing plan not found" });
            res.status(200).json({ success: true, data: editingPlan });
        } catch (error) {
            next(error);
        }
    }
}

export default new EditingController();