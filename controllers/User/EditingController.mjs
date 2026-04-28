import EditingPlan from "../../models/EditingPlan.mjs";
import Cart from "../../models/Cart.mjs";
import TeamShootPlan from "../../models/TeamShootPlan.mjs"

const findPlan = async (planId) => {
    try {
        let plan;
        plan = await EditingPlan.findById(planId);
        if (!plan) {
            plan = await TeamShootPlan.findById(planId);
        }
        return plan; // Returns null if not found
    } catch (error) {
        console.error("Error fetching plan:", error);
        throw error;
    }
};
class EditingController {
    async getAll(req, res, next) {
        try {
            const { planCategory } = req.query;
            const filter = {};
            if (planCategory) {
                filter.planCategory = planCategory;
            }
            const editingPlans = await EditingPlan.find(filter);
            res.status(200).json({ success: true, data: editingPlans });
        } catch (error) {
            next(error);
        }
    }


    async getStandardPlans(req, res, next) {
        try {
            const editingPlans = await EditingPlan.find({ planCategory: "standard" });
            res.status(200).json({ success: true, data: editingPlans });
        } catch (error) {
            next(error);
        }
    }

    async getPremiumPlans(req, res, next) {
        try {
            const editingPlans = await EditingPlan.find({ planCategory: "premium" });
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
    // ✅ Update Quantity (Increase / Decrease)
    async updateQuantity(req, res) {
        try {
            const userId = req.user.id;
            const { action, itemId } = req.body;

            if (!["increase", "decrease"].includes(action)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid action. Use 'increase' or 'decrease'.",
                });
            }

            const cart = await Cart.findOne({
                userId,
                status: "active",
            });

            if (!cart) {
                return res.status(404).json({
                    success: false,
                    message: "Active cart not found",
                });
            }

            // ✅ Find Item
            let itemindex = cart.items.findIndex(
                (i) =>
                    i._id.toString() === itemId ||
                    i.planId.toString() === itemId
            );

            if (itemindex === -1) {
                return res.status(404).json({
                    success: false,
                    message: "Item not found in cart",
                });
            }

            const item = cart.items[itemindex];

            // ✅ Update quantity
            if (action === "increase") {
                item.quantity += 1;
            } else {
                if (item.quantity > 1) {
                    item.quantity -= 1;
                } else {
                    cart.items.splice(itemindex, 1);
                }
            }

            // ✅ Recalculate total
            cart.totalAmount = cart.items.reduce(
                (acc, i) => acc + i.price * i.quantity,
                0
            );

            await cart.save();

            res.status(200).json({
                success: true,
                message:
                    action === "increase"
                        ? "Quantity increased"
                        : "Quantity decreased",
                data: cart,
            });
        } catch (error) {
            console.error("Update Quantity Error:", error);
            res.status(500).json({
                success: false,
                message: "Server error during quantity update",
            });
        }
    }

    async addToCart(req, res) {
        try {
            const userId = req.user.id;
            const { editingPlanId, quantity = 1, selectedRoleId } = req.body;
            console.log("Editing")
            // ✅ Find Editing Plan
            const plan = await EditingPlan.findById(editingPlanId);

            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: "Editing plan not found",
                });
            }

            // ✅ Find or Create Cart
            let cart = await Cart.findOne({
                userId: userId,
                status: "active",
            });

            if (!cart) {
                cart = new Cart({
                    userId: userId,
                    items: [],
                });
            }

            // ✅ Check existing item by planId
            const existingItem = cart.items.find(
                (item) => item.planId?.toString() === editingPlanId && item.category === "editing"
            );
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                cart.items.push({
                    name: plan.planName,
                    category: "editing",
                    price: plan.price,
                    quantity,
                    planId: editingPlanId,
                    selectedroleId: selectedRoleId

                });
            }

            // Recalculate totalAmount
            cart.totalAmount = cart.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);

            await cart.save();

            res.status(200).json({
                success: true,
                message: "Editing plan added to cart",
                data: cart,
            });
        } catch (error) {
            console.error("Add to cart error:", error);

            res.status(500).json({
                success: false,
                message: "Server error",
            });
        }
    }

    async getMyCart(req, res) {
        try {
            const userId = req.user.id;
            const cart = await Cart.findOne({ userId, status: "active" });

            res.status(200).json({
                success: true,
                data: cart || { items: [], totalAmount: 0 },
            });
        } catch (error) {
            console.error("Get cart error:", error);
            res.status(500).json({
                success: false,
                message: "Server error",
            });
        }
    }
    async getplanBynumberOfVideos(req, res) {
        try {
            const numberOfVideos = req.params.numberOfvideos;
            const plans = await EditingPlan.find({ numberOfVideos: numberOfVideos });
            if (!plans) {
                return res.status(404).json({ success: false, message: "Editing plans not found" });
            }
            res.status(200).json({ success: true, message: "Editing plans fetched successfully", plans });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    async getplanByPlanCategory(req, res) {
        try {
            const plansDetails = await EditingPlan.find({}).select('numberOfVideos price subtitle');

            if (!plansDetails || plansDetails.length === 0) {
                return res.status(200).json({ success: true, message: "No plan found please contact admin", plansDetails: [] });
            }
            res.status(200).json({ success: true, message: "Editing plans fetched successfully", plansDetails });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

export default new EditingController();