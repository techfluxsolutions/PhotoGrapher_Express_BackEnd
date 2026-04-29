import PhotographyPlan from "../../models/PhotographyPlan.mjs";

class PhotographyController {
    async getAll(req, res, next) {
        try {
            const photographyPlans = await PhotographyPlan.find();
            res.status(200).json({ success: true, data: photographyPlans });
        } catch (error) {
            next(error);
        }
    }
    async getOne(req, res, next) {
        try {
            const { id } = req.params;
            const photographyPlan = await PhotographyPlan.findById(id);
            if (!photographyPlan) return res.status(404).json({ success: false, message: "Photography plan not found" });
            res.status(200).json({ success: true, data: photographyPlan });
        } catch (error) {
            next(error);
        }
    }
}

export default new PhotographyController();
