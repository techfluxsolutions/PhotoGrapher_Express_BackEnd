import SubscribedUser from "../../models/SubscribedUser.mjs";

class SubscribedUserService {
    async createSubscriber(email) {

        try {
            // check for valid email 
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return {
                    success: false,
                    message: "Please enter a valid email address.",
                };
            }
            // check if already subscribed
            const isAlreadySubscribed = await SubscribedUser.findOne({ email });
            if (isAlreadySubscribed) {
                return {
                    success: false,
                    message: "You are already subscribed !",
                };
            }
            const subscriber = await SubscribedUser.create({ email });
            if (subscriber) {
                return {
                    success: true,
                    message: "Thank you for subscribing !",
                };
            }
        } catch (error) {
            throw error;
        }
    }

    async getAllSubscribers() {
        try {
            return await SubscribedUser.find().sort({ createdAt: -1 });
        } catch (error) {
            throw error;
        }
    }

    // ✅ READ (by ID)
    async getSubscriberById(id) {
        try {
            return await SubscribedUser.findById(id);
        } catch (error) {
            throw error;
        }
    }

    // ✅ READ (by email)
    async getSubscriberByEmail(email) {
        try {
            return await SubscribedUser.findOne({ email });
        } catch (error) {
            throw error;
        }
    }

    // ✅ UPDATE
    async updateSubscriber(id, email) {
        try {
            return await SubscribedUser.findByIdAndUpdate(
                id,
                { email },
                { new: true }
            );
        } catch (error) {
            throw error;
        }
    }

    // ✅ DELETE
    async deleteSubscriber(id) {
        try {
            return await SubscribedUser.findByIdAndDelete(id);
        } catch (error) {
            throw error;
        }
    }
}

export default new SubscribedUserService();
