import Cart from "../../models/Cart.mjs";

class CartController {
    async create(req, res, next) {
        try {
            const { userId } = req.user;
            const { items, totalAmount } = req.body;
            const cart = new Cart({ userId, items, totalAmount });
            await cart.save();
            res.status(201).json({ success: true, data: cart });
        } catch (error) {
            next(error);
        }
    }
    async getAll(req, res, next) {
        try {
            const carts = await Cart.find({});
            res.status(200).json({ success: true, data: carts });
        } catch (error) {
            next(error);
        }
    }
    async getOne(req, res, next) {
        try {
            const { id } = req.params;
            const { userId } = req.user;
            const cart = await Cart.findById({ _id: id, userId });
            res.status(200).json({ success: true, data: cart });
        } catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            const { userId } = req.user;
            const { id } = req.params;
            const { items, totalAmount } = req.body;
            const cart = await Cart.findByIdAndUpdate({ _id: id, userId }, { items, totalAmount }, { new: true });
            res.status(200).json({ success: true, data: cart });
        } catch (error) {
            next(error);
        }
    }
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const { userId } = req.user;
            const cart = await Cart.findByIdAndDelete({ _id: id, userId });
            res.status(200).json({ success: true, data: cart });
        } catch (error) {
            next(error);
        }
    }

    async addToCart(req, res, next) {
        try {
            const { userId } = req.user;
            const { name, category, price, quantity } = req.body;
            const cart = new Cart({ userId, items: { name, category, price, quantity } });
            await cart.save();
            res.status(201).json({ success: true, data: cart });
        } catch (error) {
            next(error);
        }
    }

    async getMyCart(req, res, next) {
        try {
            const { userId } = req.user;
            const cart = await Cart.findOne({ userId });
            res.status(200).json({ success: true, data: cart });
        } catch (error) {
            next(error);
        }
    }
}

export default new CartController();
