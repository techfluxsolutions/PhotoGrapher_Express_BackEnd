import TeamShootPlan from "../../models/TeamShootPlan.mjs";

class AdminTeamShootController {
    // 1. Create a new team shoot plan
    async create(req, res, next) {
        try {
            const { teamCategory, role, pricingType, pricingOptions, fixedPrice, features, isBaseIncluded } = req.body;
            
            // Basic validation depending on pricingType
            if (pricingType === "duration_based" && (!pricingOptions || pricingOptions.length === 0)) {
                 return res.status(400).json({ success: false, message: "duration_based pricing requires pricingOptions" });
            }
            if (pricingType === "fixed" && (fixedPrice === undefined || fixedPrice === null)) {
                 return res.status(400).json({ success: false, message: "fixed pricing requires a fixedPrice" });
            }

            const newPlan = new TeamShootPlan({
                teamCategory,
                role,
                pricingType,
                pricingOptions,
                fixedPrice,
                features,
                isBaseIncluded
            });

            await newPlan.save();
            res.status(201).json({ success: true, message: "Plan created successfully", data: newPlan });
        } catch (error) {
            next(error);
        }
    }

    // 2. Get all plans (optional filter by type)
    async getAll(req, res, next) {
        try {
            const { teamCategory } = req.query;
            const filter = {};
            if (teamCategory) {
                 filter.teamCategory = teamCategory;
            }
            const plans = await TeamShootPlan.find(filter).sort({ createdAt: -1 });
            res.status(200).json({ success: true, data: plans });
        } catch (error) {
            next(error);
        }
    }

    // 3. Get single plan by ID
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const plan = await TeamShootPlan.findById(id);
            if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
            res.status(200).json({ success: true, data: plan });
        } catch (error) {
            next(error);
        }
    }

    // 4. Update an existing plan
    async update(req, res, next) {
        try {
            const { id } = req.params;
            const updateData = req.body;

            // Enforce logic validation during update if pricing types change
            if (updateData.pricingType === "duration_based" && (!updateData.pricingOptions || updateData.pricingOptions.length === 0)) {
                 return res.status(400).json({ success: false, message: "duration_based pricing requires pricingOptions" });
            }
            if (updateData.pricingType === "fixed" && (updateData.fixedPrice === undefined || updateData.fixedPrice === null)) {
                 return res.status(400).json({ success: false, message: "fixed pricing requires a fixedPrice" });
            }

            const updatedPlan = await TeamShootPlan.findByIdAndUpdate(
                id,
                updateData,
                { new: true, runValidators: true }
            );

            if (!updatedPlan) return res.status(404).json({ success: false, message: "Plan not found" });
            res.status(200).json({ success: true, message: "Plan updated successfully", data: updatedPlan });
        } catch (error) {
            next(error);
        }
    }

    // 5. Delete a plan
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const deletedPlan = await TeamShootPlan.findByIdAndDelete(id);
            if (!deletedPlan) return res.status(404).json({ success: false, message: "Plan not found" });
            res.status(200).json({ success: true, message: "Plan deleted successfully" });
        } catch (error) {
            next(error);
        }
    }
}

export default new AdminTeamShootController();
