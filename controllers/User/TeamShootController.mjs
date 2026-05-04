import TeamShootPlan from "../../models/TeamShootPlan.mjs";
import Cart from "../../models/Cart.mjs";

class TeamShootController {
    // 1. Fetch all shoot team configurations
    async getPlans(req, res, next) {
        try {
            const { type } = req.params; // ?type=standard or premium
            ``
            console.log(req.query)
            if (!type || type.trim() == "") {
                return res.status(400).json({ success: false, message: "Invalid type" });
            }
            const plans = await TeamShootPlan.find({ teamCategory: type.trim() });

            res.status(200).json({
                success: true,
                data: plans
            });
        } catch (error) {
            next(error);
        }
    }

    // 2. Add an entire team selection to the Cart
    async addTeamToCart(req, res, next) {
        try {
            const userId = req.user.id;
            // The body expects an array of selections:
            // [ { planId: "...", durationValue: 3 } , { planId: "..." } ]
            const { selections } = req.body;

            if (!Array.isArray(selections) || selections.length === 0) {
                return res.status(400).json({ success: false, message: "Selections cannot be empty" });
            }

            let cart = await Cart.findOne({ userId: userId, status: "active" });

            if (!cart) {
                cart = new Cart({ userId: userId, items: [] });
            }

            for (const selection of selections) {
                const plan = await TeamShootPlan.findById(selection.planId);

                if (!plan) continue;

                let itemPrice = 0;
                let itemName = plan.role;

                if (plan.pricingType === "duration_based") {
                    if (!plan.pricingOptions || plan.pricingOptions.length === 0) {
                        return res.status(500).json({ success: false, message: `Pricing options missing for ${plan.role}` });
                    }
                    // Find matching pricing option by ID
                    const durationOption = plan.pricingOptions.find(opt => opt._id.toString() === selection.selectedroleId);

                    if (!durationOption) {
                        return res.status(400).json({
                            success: false,
                            message: `Invalid selection for ${plan.role}`
                        });
                    }
                    itemPrice = durationOption.price || 0;
                    itemName = `${plan.role} (${durationOption.durationText})`;
                } else if (plan.pricingType === "fixed") {
                    itemPrice = plan.fixedPrice || 0;
                }

                // Check if already in cart by planId and selectedroleId (or just name if fixed)
                const existingItemIndex = cart.items.findIndex(item => {
                    if (plan.pricingType === "duration_based") {
                        return item.planId?.toString() === selection.planId && 
                               item.selectedroleId?.toString() === selection.selectedroleId;
                    }
                    return item.name === itemName && item.category === "shoot_team";
                });

                if (existingItemIndex !== -1) {
                    cart.items[existingItemIndex].quantity += (selection.quantity || 1);
                } else {
                    cart.items.push({
                        name: itemName,
                        category: "shoot_team",
                        price: itemPrice,
                        quantity: selection.quantity || 1,
                        planId: selection.planId,
                        selectedroleId: selection.selectedroleId,
                        subCategoryType: plan.teamCategory,
                        subCategoryName: plan.role
                    });
                }
            }

            // Recalculate total Amount and sanitize items
            cart.totalAmount = cart.items.reduce((acc, item) => {
                const price = Number(item.price) || 0;
                const qty = Number(item.quantity) || 0;
                return acc + (price * qty);
            }, 0);

            // Ensure all items have subCategoryType (fix for legacy items)
            for (let item of cart.items) {
                if (!item.subCategoryType) {
                    item.subCategoryType = "standard"; // Default fallback
                }
            }

            await cart.save();

            res.status(200).json({
                success: true,
                message: "Team successfully added to cart",
                cart: cart
            });

        } catch (error) {
            console.error("Team Shoot add to cart error:", error.stack || error);
            if (error.name === "CastError") {
                return res.status(400).json({ success: false, message: "Invalid ID format" });
            }
            res.status(500).json({ success: false, message: error.message || "Server error" });
        }
    }
}

export default new TeamShootController();
