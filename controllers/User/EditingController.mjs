import EditingPlan from "../../models/EditingPlan.mjs";
import Cart from "../../models/Cart.mjs";
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
    // ✅ Update Quantity (Increase / Decrease)
    async updateQuantity(req, res) {
        try {
            const userId = req.user.id;

            let { editingPlanId, planName, action } = req.body;

            // ✅ validate action
            if (!["increase", "decrease"].includes(action)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid action",
                });
            }

            // ✅ Get plan name if only ID provided
            if (editingPlanId && !planName) {
                const plan = await EditingPlan.findById(editingPlanId);

                if (!plan) {
                    return res.status(404).json({
                        success: false,
                        message: "Editing plan not found",
                    });
                }

                planName = plan.planName;
            }

            // ✅ Find Active Cart
            const cart = await Cart.findOne({
                userId: userId,
                status: "active",
            });

            if (!cart) {
                return res.status(404).json({
                    success: false,
                    message: "Cart not found",
                });
            }

            // ✅ Find Item Index
            const itemIndex = cart.items.findIndex(
                (i) => i.name === planName && i.category === "editing"
            );

            if (itemIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: "Item not found in cart",
                });
            }

            const item = cart.items[itemIndex];

            // 🔥 MAIN LOGIC
            if (action === "increase") {
                item.quantity += 1;
            }

            if (action === "decrease") {
                if (item.quantity > 1) {
                    item.quantity -= 1;
                } else {
                    // remove item
                    cart.items.splice(itemIndex, 1);
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
                cart,
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Server error",
            });
        }
    }
    async addToCart(req, res) {
        try {
            const userId = req.user.id;
            const { editingPlanId, quantity = 1 } = req.body;
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

            // ✅ Check existing item by name (since model doesn't have editingPlan ref)
            const existingItem = cart.items.find(
                (item) => item.name === plan.planName && item.category === "editing"
            );

            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                cart.items.push({
                    name: plan.planName,
                    category: "editing",
                    price: plan.price,
                    quantity,
                });
            }

            // Recalculate totalAmount
            cart.totalAmount = cart.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);

            await cart.save();

            res.status(200).json({
                success: true,
                message: "Editing plan added to cart",
                cart,
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
                cart: cart || { items: [], totalAmount: 0 },
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
            const plansDetails = await EditingPlan.find({ planCategory: "standard" }).select('numberOfVideos price');

            if (!plansDetails) {
                res.status(200).json({ success: true, message: "No plan found please contact admin", plansDetails: [] });
            }
            res.status(200).json({ success: true, message: "Editing plans fetched successfully", plansDetails });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

export default new EditingController();