import SubscribedUser from "../../models/SubscribedUser.mjs";

class SubscribedUserService {
    async createSubscriber(req, res, next) {
        try {
            const { email } = req.body;

            // check for valid email 
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid email address.",
                });
            }

            // check if already subscribed
            const isAlreadySubscribed = await SubscribedUser.findOne({ email });
            if (isAlreadySubscribed) {
                return res.status(400).json({
                    success: false,
                    message: "You are already subscribed !",
                });
            }

            const subscriber = await SubscribedUser.create({ email });
            if (subscriber) {
                return res.status(201).json({
                    success: true,
                    message: "Thank you for subscribing !",
                });
            }
        } catch (error) {
            return next(error);
        }
    }

    async getAllSubscribers(req, res, next) {
        try {
            // pagination
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const subscribers = await SubscribedUser.find().skip(skip).limit(limit);
            if (!subscribers) {
                return res.status(404).json({
                    success: true,
                    message: "No subscriber found !",
                });
            }
            return res.status(200).json({
                success: true,
                data: subscribers,
                totalPages: page,
                limit: limit,
                total: subscribers.length,
            });
        } catch (error) {
            return next(error);
        }
    }

    // ✅ READ (by ID)
    async getSubscriberById(req, res, next) {
        try {
            const { id } = req.params;
            const subscriber = await SubscribedUser.findById(id);
            if (!subscriber) {
                return res.status(404).json({
                    success: true,
                    message: "No subscriber found !",
                });
            }
            return res.status(200).json({
                success: true,
                subscriber,
            });
        } catch (error) {
            return next(error);
        }
    }

    // ✅ READ (by email)
    async getSubscriberByEmail(req, res, next) {
        try {
            const { email } = req.params;
            const subscriber = await SubscribedUser.findOne({ email });
            if (!subscriber) {
                return res.status(404).json({
                    success: true,
                    message: "No subscriber found !",
                });
            }
            return res.status(200).json({
                success: true,
                subscriber,
            });
        } catch (error) {
            return next(error);
        }
    }

    // ✅ UPDATE
    async updateSubscriber(req, res, next) {
        try {
            const { id } = req.params;
            const { email } = req.body;
            const subscriber = await SubscribedUser.findByIdAndUpdate(
                id,
                { email },
                { new: true }
            );
            if (!subscriber) {
                return res.status(404).json({
                    success: true,
                    message: "No subscriber found !",
                });
            }
            return res.status(200).json({
                success: true,
                subscriber,
            });
        } catch (error) {
            return next(error);
        }
    }

    // ✅ DELETE
    async deleteSubscriber(req, res, next) {
        try {
            const { id } = req.params;
            const subscriber = await SubscribedUser.findByIdAndDelete(id);
            if (!subscriber) {
                return res.status(404).json({
                    success: true,
                    message: "No subscriber found !",
                });
            }
            return res.status(200).json({
                success: true,
                subscriber,
            });
        } catch (error) {
            return next(error);
        }
    }
}

export default new SubscribedUserService();
