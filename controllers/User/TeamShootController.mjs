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
                    // Find matching duration price
                    const durationOption = plan.pricingOptions.find(opt => opt.durationValue === selection.durationValue);

                    if (!durationOption) {
                        return res.status(400).json({
                            success: false,
                            message: `Invalid duration ${selection.durationValue} for ${plan.role}`
                        });
                    }
                    itemPrice = durationOption.price;
                    itemName = `${plan.role} (${selection.durationValue}hr)`;
                } else if (plan.pricingType === "fixed") {
                    itemPrice = plan.fixedPrice;
                }

                // Check if already in cart
                const existingItemIndex = cart.items.findIndex(
                    item => item.name === itemName && item.category === "shoot_team"
                );

                if (existingItemIndex !== -1) {
                    cart.items[existingItemIndex].quantity += (selection.quantity || 1);
                } else {
                    cart.items.push({
                        name: itemName,
                        category: "shoot_team",
                        price: itemPrice,
                        quantity: selection.quantity || 1
                    });
                }
            }

            // Recalculate total Amount
            cart.totalAmount = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

            await cart.save();

            res.status(200).json({
                success: true,
                message: "Team successfully added to cart",
                cart: cart
            });

        } catch (error) {
            console.error("Team Shoot add to cart error:", error);
            res.status(500).json({ success: false, message: "Server error" });
        }
    }
}

export default new TeamShootController();
