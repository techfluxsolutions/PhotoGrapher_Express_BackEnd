import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
    {
        editingPlan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EditingPlan",
            required: true,
        },

        quantity: {
            type: Number,
            default: 1,
        },

        // snapshot fields (VERY IMPORTANT)
        planName: String,
        price: Number,
    },
    { _id: false }
);

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        items: [cartItemSchema],

        totalAmount: {
            type: Number,
            default: 0,
        },

        status: {
            type: String,
            enum: ["active", "converted", "cancelled"],
            default: "active",
        },
    },
    { timestamps: true }
);

// ✅ Auto total calculation
cartSchema.pre("save", function (next) {
    this.totalAmount = this.items.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0
    );
    next();
});

export default mongoose.model("Cart", cartSchema);