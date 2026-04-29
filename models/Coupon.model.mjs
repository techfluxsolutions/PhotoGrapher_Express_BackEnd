import mongoose from "mongoose";

const CouponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },

        title: {
            type: String,
            required: true,
        },

        description: String,

        couponType: {
            type: String,
            enum: ["Service", "HourlyShoot", "PhotoEditing", "CustomizeBooking"],
            required: true,
        },

        discountType: {
            type: String,
            enum: ["percentage", "flat"],
            required: true,
        },

        discountValue: {
            type: Number,
            required: true,
        },

        minimumAmount: {
            type: Number,
            default: 0,
        },

        maxDiscountAmount: Number,

        usageLimit: {
            type: Number,
            default: 1,
        },

        usedCount: {
            type: Number,
            default: 0,
        },

        validFrom: {
            type: Date,
            required: true,
        },

        validTill: {
            type: Date,
            required: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model("Coupon", CouponSchema);
