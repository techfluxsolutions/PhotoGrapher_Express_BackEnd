import ReviewAndRating from "../../models/ReviewAndRating.mjs";

class ReviewAndRatingController {
    // ✅ CREATE REVIEW & RATING
    async create(req, res, next) {
        try {
            const {
                clientId,
                photographerId,
                bookingId,
                serviceId,
                ratingCount,
                rateComments,
            } = req.body;

            // Prevent duplicate review for same booking by same client
            const existingReview = await ReviewAndRating.findOne({
                clientId,
                bookingId,
                serviceId
            });

            if (existingReview) {
                return res.status(409).json({
                    success: false,
                    message: "Review already submitted for this booking",
                });
            }

            const review = await ReviewAndRating.create({
                clientId,
                photographerId,
                serviceId,
                bookingId,
                ratingCount,
                rateComments,
            });

            return res.status(201).json({
                success: true,
                message: "Review submitted successfully",
                data: review,
            });
        } catch (error) {
            next(error);
        }
    }
    async getAll(req, res, next) {
        try {
            const { page = 1, limit = 10 } = req.query;

            const skip = (Number(page) - 1) * Number(limit);

            const [reviews, totalRecords] = await Promise.all([
                ReviewAndRating.find()
                    .skip(skip)
                    .limit(Number(limit))
                    .sort({ createdAt: -1 }),
                ReviewAndRating.countDocuments(),
            ]);

            return res.status(200).json({
                success: true,
                data: reviews,
                pagination: {
                    totalRecords,
                    totalPages: Math.ceil(totalRecords / limit),
                    currentPage: Number(page),
                    limit: Number(limit),
                },
            });
        } catch (error) {
            next(error);
        }
    }

}

export default new ReviewAndRatingController();
