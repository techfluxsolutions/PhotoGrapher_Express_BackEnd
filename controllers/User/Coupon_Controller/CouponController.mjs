import Coupon from "../../../models/Coupon.model.mjs";

class CouponController {

    /**
     * CREATE COUPON
     */
    async createCoupon(req, res) {
        try {
            const coupon = await Coupon.create(req.body);

            res.status(201).json({
                success: true,
                message: "Coupon created successfully",
                data: coupon,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * GET ALL COUPONS (Pagination + Filter)
     * query:
     * ?page=1&limit=10&type=Service&active=true
     */
    async getAllCoupons(req, res) {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const filter = {};

            if (req.query.type)
                filter.couponType = req.query.type;

            if (req.query.active !== undefined)
                filter.isActive = req.query.active === "true";

            const [coupons, total] = await Promise.all([
                Coupon.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit),

                Coupon.countDocuments(filter),
            ]);

            res.json({
                success: true,
                data: coupons,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * GET COUPON BY ID
     */
    async getCouponById(req, res) {
        try {
            const coupon = await Coupon.findById(req.params.id);

            if (!coupon)
                return res.status(404).json({
                    success: false,
                    message: "Coupon not found",
                });

            res.json({
                success: true,
                data: coupon,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * UPDATE COUPON
     */
    async updateCoupon(req, res) {
        try {
            const coupon = await Coupon.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true }
            );

            if (!coupon)
                return res.status(404).json({
                    success: false,
                    message: "Coupon not found",
                });

            res.json({
                success: true,
                message: "Coupon updated",
                data: coupon,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * DELETE COUPON
     */
    async deleteCoupon(req, res) {
        try {
            const coupon = await Coupon.findByIdAndDelete(req.params.id);

            if (!coupon)
                return res.status(404).json({
                    success: false,
                    message: "Coupon not found",
                });

            res.json({
                success: true,
                message: "Coupon deleted successfully",
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * TOGGLE ACTIVE / INACTIVE
     */
    async toggleCouponStatus(req, res) {
        try {
            const coupon = await Coupon.findById(req.params.id);

            if (!coupon)
                return res.status(404).json({
                    success: false,
                    message: "Coupon not found",
                });

            coupon.isActive = !coupon.isActive;
            await coupon.save();

            res.json({
                success: true,
                message: "Coupon status updated",
                data: coupon,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }

    /**
     * VALIDATE COUPON (USED DURING BOOKING CHECKOUT)
     */
    async validateCoupon(req, res) {
        try {
            const { code, amount, couponType } = req.body;

            const coupon = await Coupon.findOne({
                code: code.toUpperCase(),
                couponType,
                isActive: true,
            });

            if (!coupon)
                return res.status(400).json({
                    success: false,
                    message: "Invalid coupon",
                });

            const now = new Date();

            if (now < coupon.validFrom || now > coupon.validTill)
                return res.status(400).json({
                    success: false,
                    message: "Coupon expired",
                });

            if (coupon.usedCount >= coupon.usageLimit)
                return res.status(400).json({
                    success: false,
                    message: "Coupon usage limit reached",
                });

            if (amount < coupon.minimumAmount)
                return res.status(400).json({
                    success: false,
                    message: `Minimum amount ₹${coupon.minimumAmount} required`,
                });

            let discount = 0;

            if (coupon.discountType === "percentage") {
                discount = (amount * coupon.discountValue) / 100;

                if (coupon.maxDiscountAmount)
                    discount = Math.min(discount, coupon.maxDiscountAmount);
            } else {
                discount = coupon.discountValue;
            }

            res.json({
                success: true,
                message: "Coupon applied",
                discount,
                finalAmount: amount - discount,
                coupon,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }
}

export default new CouponController();