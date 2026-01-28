import mongoose from "mongoose";

const subscribedUserSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
    },
    { timestamps: true }
);

const SubscribedUser = mongoose.model("SubscribedUser", subscribedUserSchema);
export default SubscribedUser;
