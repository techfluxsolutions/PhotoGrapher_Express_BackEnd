import Cart from "../../models/Cart.mjs";

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

    async getAll(req, res, next) {
        try {
            // By default, only get the user's carts if this is a user endpoint
            const { id: userId } = req.user;
            const carts = await Cart.find({ userId });
            res.status(200).json({ success: true, data: carts });
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
            // Find most recent active cart
            const cart = await Cart.findOne({ userId, status: "active" }).sort({ createdAt: -1 });
            res.status(200).json({ success: true, data: cart });
        } catch (error) {
            next(error);
        }
    }
}

export default new CartController();
