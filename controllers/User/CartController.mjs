import Cart from "../../models/Cart.mjs";
import User from "../../models/User.mjs"
class CartController {
    // Create logic (often used for multiple items)
    async create(req, res, next) {
        try {
            const { id: userId } = req.user;
            const { items } = req.body;

            // Calculate totalAmount
            const totalAmount = items.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0);

            const cart = new Cart({ userId, items, totalAmount });
            await cart.save();
            res.status(201).json({ success: true, data: cart });
        } catch (error) {
            next(error);
        }
    }



    async getOne(req, res, next) {
        try {
            const { id } = req.params;
            const { id: userId } = req.user;
            // FIXED: Use findOne for multiple filters
            const cart = await Cart.findOne({ _id: id, userId });
            if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });
            res.status(200).json({ success: true, data: cart });
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const { id: userId } = req.user;
            const { id } = req.params;
            const { items, status } = req.body;

            // Recalculate totalAmount if items are provided
            let totalAmount;
            if (items) {
                totalAmount = items.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0);
            }

            // FIXED: Use findOneAndUpdate for multiple filters
            const cart = await Cart.findOneAndUpdate(
                { _id: id, userId },
                { items, totalAmount, status },
                { new: true, runValidators: true }
            );

            if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });
            res.status(200).json({ success: true, data: cart });
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const { id: userId } = req.user;
            // FIXED: Use findOneAndDelete for multiple filters
            const cart = await Cart.findOneAndDelete({ _id: id, userId });
            if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });
            res.status(200).json({ success: true, data: cart, message: "Cart deleted successfully" });
        } catch (error) {
            next(error);
        }
    }

    async addToCart(req, res, next) {
        try {
            const { id: userId } = req.user;
            const { name, category, price, quantity } = req.body;

            // Calculate total for this specific item
            const totalAmount = price * (quantity || 1);

            // Create a new cart entry as per user requirement to keep them separate
            const cart = new Cart({
                userId,
                items: [{ name, category, price, quantity: quantity || 1 }],
                totalAmount
            });

            await cart.save();
            res.status(201).json({ success: true, data: cart });
        } catch (error) {
            next(error);
        }
    }

    async getMyCart(req, res, next) {
        try {
            const { id: userId } = req.user;

            const userData = await User.findById(userId)
                .select("username mobileNumber");

            // Get latest active cart
            const cart = await Cart.findOne({
                userId,
                status: "active"
            })
                .sort({ createdAt: -1 })
                .populate({
                    path: "userId",
                    select: "username mobileNumber"
                });

            // No cart
            if (!cart) {
                return res.status(200).json({
                    success: true,
                    message: "Your Cart Has No Items",
                    data: { userId: userData }
                });
            }

            /**
             * ✅ GST Calculation (18%)
             */
            const cartData = cart.toObject();

            // const gstAmount = Number(
            //     (cartData.totalAmount * 0.18).toFixed(2)
            // );

            // const finalAmount = Number(
            //     (cartData.totalAmount + gstAmount).toFixed(2)
            // );

            // cartData.gst = gstAmount;
            cartData.finalAmount = cartData.totalAmount;

            res.status(200).json({
                success: true,
                data: cartData
            });

        } catch (error) {
            next(error);
        }
    }

    async updateItemQuantity(req, res, next) {
        try {
            const userId = req.user.id;
            const { itemId, action } = req.body;

            if (!["increase", "decrease"].includes(action)) {
                return res.status(400).json({ success: false, message: "Invalid action" });
            }

            const cart = await Cart.findOne({ userId, status: "active" });

            if (!cart) {
                return res.status(404).json({ success: false, message: "Cart not found" });
            }

            const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);

            if (itemIndex === -1) {
                return res.status(404).json({ success: false, message: "Item not found in cart" });
            }

            const item = cart.items[itemIndex];

            if (action === "increase") {
                item.quantity += 1;
            } else if (action === "decrease") {
                if (item.quantity > 1) {
                    item.quantity -= 1;
                } else {
                    cart.items.splice(itemIndex, 1);
                }
            }

            cart.totalAmount = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
            await cart.save();

            res.status(200).json({ success: true, data: cart });
        } catch (error) {
            next(error);
        }
    }
}

export default new CartController();
