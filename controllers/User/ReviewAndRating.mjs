
import ReviewAndRating from "../../models/ReviewAndRating.mjs";
import Photographer from "../../models/Photographer.mjs"
class ReviewAndRatingController {
    // ✅ CREATE REVIEW & RATING
    async create(req, res, next) {
        try {
            const {
                createdBy,
                clientId,
                photographerId,
                bookingId,
                serviceId,
                ratingCount,
                rateComments,
            } = req.body;

            // Prevent duplicate review for same booking by same client
            let existingReview;
            if (createdBy === "user") {
                existingReview = await ReviewAndRating.findOne({
                    createdBy,
                    bookingId,
                    serviceId,
                });
            }
            if (createdBy === "admin") {
                existingReview = await ReviewAndRating.findOne({
                    createdBy,
                    photographerId,
                });
            }
            if (existingReview) {
                return res.status(200).json({
                    success: true,
                    message: "Review already submitted for this booking",
                    existingReview: existingReview
                });
            }

            const review = await ReviewAndRating.create({
                createdBy,
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
    async getThreeRatings(req, res, next) {
        try {
            const reviews = await ReviewAndRating.find()
                .sort({ createdAt: -1 })
                .limit(3)
                .populate('clientId', 'avatar username')
                .lean();

            const formattedReviews = reviews.map(review => ({
                _id: review._id,
                ratingCount: review.ratingCount,
                rateComments: review.rateComments,
                createdAt: review.createdAt,
                username: review.clientId?.username || null,
                clientId: review.clientId?._id || null,
                avatar: process.env.BASE_URL && review.clientId?.avatar ? `${process.env.BASE_URL}${review.clientId?.avatar}` : "",
            }));

            return res.status(200).json({
                success: true,
                data: formattedReviews,
            });
        } catch (error) {
            next(error);
        }
    }

    async getAverageOfPhotographerRating(req, res, next) {
        const photographerId = req.user.id;
        console.log(photographerId)

        try {
            // 1. Fetch all User Ratings
            const userRatings = await ReviewAndRating.find({
                photographerId,
                createdBy: "user"
            });

            // 2. Fetch Admin Rating
            const adminRating = await ReviewAndRating.findOne({
                photographerId,
                createdBy: "admin"
            }).populate("photographerId", 'professionalDetails.expertiseLevel basicInfo.profilePhoto basicInfo.fullName');

            // 3. Combined Average Calculation
            let totalRatingSum = userRatings.reduce((acc, r) => acc + (r.ratingCount || 0), 0);
            let totalRatingCount = userRatings.length;

            if (adminRating) {
                totalRatingSum += (adminRating.ratingCount || 0);
                totalRatingCount += 1;
            }

            // 3. Scale down to 1-5 (assuming input is out of 10)
            const averageRating = totalRatingCount > 0 ? parseFloat(((totalRatingSum / totalRatingCount) / 2).toFixed(1)) : 0;

            // 4. Metadata and Transformation
            const photographerDetails = await Photographer.findById(photographerId).select("basicInfo.fullName basicInfo.profilePhoto professionalDetails.expertiseLevel")
            const avatar = process.env.BASE_URL && photographerDetails?.basicInfo?.profilePhoto ? `${process.env.BASE_URL}${photographerDetails.basicInfo.profilePhoto}` : "";

            if (adminRating && adminRating.photographerId && adminRating.photographerId.basicInfo) {
                adminRating.photographerId.basicInfo.profilePhoto = avatar;
            }

            const collectiveAvg = Math.min(5, Math.max(0, averageRating));

            return res.status(200).json({
                success: true,
                avgRating: collectiveAvg,
                totalUserRatings: userRatings.length,
                adminRating,
                avatar: avatar,
                photographerDetails
            });

        } catch (error) {
            next(error);
        }
    }

    // get rating given by admin 

    async getAdminRating(req, res, next) {
        try {
            const adminRating = await ReviewAndRating.find({
                createdBy: "admin"
            })
            return res.status(200).json({
                success: true,
                adminRating
            });
        } catch (error) {
            next(error);
        }
    }

    //edit rating

    async editRating(req, res, next) {
        try {
            const { ratingId } = req.params
            const editingRating = await ReviewAndRating.findByIdAndUpdate(ratingId, req.body, { new: true })
            if (!editingRating) {
                return res.status(404).json({
                    success: false,
                    message: "Rating not found",
                });
            }
            return res.status(200).json({
                success: true,
                data: editingRating,
            });
        } catch (error) {
            next(error);
        }
    }

}

export default new ReviewAndRatingController();
