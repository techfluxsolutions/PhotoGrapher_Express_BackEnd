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

        applicableCategories: [{
            type: String,
            enum: ["service", "package", "duration", "editing", "shoot_team"],
        }],
    },
    { timestamps: true }
);

CouponSchema.pre("save", function () {
    if (this.isModified("couponType") || this.isNew) {
        if (this.couponType === "HourlyShoot") {
            this.applicableCategories = ["shoot_team"];
        } else if (this.couponType === "PhotoEditing") {
            this.applicableCategories = ["editing"];
        } else if (this.couponType === "Service") {
            this.applicableCategories = ["service"];
        } else if (this.couponType === "CustomizeBooking") {
            this.applicableCategories = ["duration", "package"];
        } else {
            this.applicableCategories = [];
        }
    }
});

export default mongoose.model("Coupon", CouponSchema);
