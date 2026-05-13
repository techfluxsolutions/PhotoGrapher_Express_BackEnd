
import ReviewAndRating from "../../models/ReviewAndRating.mjs";
import Photograoher from "../../models/Photographer.mjs"
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
                ratingCount: (review.ratingCount || 0) / 2,
                rateComments: review.rateComments,
                createdAt: review.createdAt,
                username: review.clientId?.username || null,
                clientId: review.clientId?._id || null,
                avatar: process.env.BASE_URL && review.clientId?.avatar ? `${process.env.BASE_URL}${review.clientId?.avatar}` : "",
            }));

            return res.status(200).json({
                success: true,
                data: [
                    {
                        "_id": "69df2db44e357de79d0635b7",
                        "ratingCount": 4.5,
                        "rateComments": `I was honestly nervous before my shoot, but they made it effortless.
The direction, lighting, and attention to detail were amazing.
Each photo perfectly reflected my personality and style.
The final edits were clean, professional, and stunning.
I’ll definitely be booking again!`,
                        "createdAt": "2026-04-15T06:18:28.249Z",
                        "username": "Raksha",
                        "clientId": "69d3485e451220b6f789ab20",
                        "avatar": "https://dev-api.veroastudioz.com/uploads/userProfile/avatar-1769776003271-448992090.jpeg"
                    },
                    {
                        "_id": "69d3800dec88cd9e797fc5a2",
                        "ratingCount": 4,
                        "rateComments": `Working with this team was the best decision for our wedding.
                        Every special moment was captured so beautifully and naturally.
                        The photos felt emotional, vibrant, and full of life.
                        They made us feel completely comfortable in front of the camera.
                        We couldn’t have asked for a better experience!`,
                        "createdAt": "2026-04-06T09:42:37.171Z",
                        "username": "Mohit",
                        "clientId": "69d3485e451220b6f789ab20",
                        "avatar": "https://dev-api.veroastudioz.com/uploads/userProfile/avatar-1769776003271-448992090.jpeg"
                    },
                    {
                        "_id": "69d35bb08a8a970dc16df7b1",
                        "ratingCount": 5,
                        "rateComments": `They covered our event with incredible professionalism.
                        Every key moment was captured without being intrusive.
                        The photos were delivered on time and exceeded expectations.
                        Quality, creativity, and passion truly show in their work.
                        Highly recommended for any special occasion!`,
                        "createdAt": "2026-04-06T07:07:28.044Z",
                        "username": "Rahil",
                        "clientId": "69d3485e451220b6f789ab20",
                        "avatar": "https://dev-api.veroastudioz.com/uploads/userProfile/avatar-1769776003271-448992090.jpeg"
                    }
                ]
            });
        } catch (error) {
            next(error);
        }
    }

    async getAverageOfPhotographerRating(req, res, next) {
        const photographerId = req.user.id;
        console.log(photographerId)

        try {
            const ratings = await ReviewAndRating.find({
                photographerId,
                createdBy: "user"
            });

            const totalUserPoints = ratings.reduce(
                (acc, r) => acc + r.ratingCount,
                0
            );

            // Scale from 1-10 to 1-5
            const userAverage = ratings.length > 0 ? (totalUserPoints / ratings.length) / 2 : 0;

            const adminRatingDoc = await ReviewAndRating.findOne({
                photographerId,
                createdBy: "admin"
            }).populate("photographerId", 'professionalDetails.expertiseLevel basicInfo.profilePhoto basicInfo.fullName');

            let adminRating = null;
            let adminRatingValue = 0;
            if (adminRatingDoc) {
                adminRating = adminRatingDoc.toObject();
                // Scale admin rating from 1-10 to 1-5
                adminRatingValue = adminRating.ratingCount / 2;
                adminRating.ratingCount = adminRatingValue;
            }

            // Calculate overall average (User + Admin) scaled to 1-5
            const totalPoints = totalUserPoints + (adminRatingDoc ? adminRatingDoc.ratingCount : 0);
            const totalVotes = ratings.length + (adminRatingDoc ? 1 : 0);
            const overallAverage = totalVotes > 0 ? (totalPoints / totalVotes) / 2 : 0;

            const photographerDetails = await Photograoher.findById(photographerId).select("basicInfo.fullName basicInfo.profilePhoto professionalDetails.expertiseLevel")
            const avatar = process.env.BASE_URL && photographerDetails?.basicInfo?.profilePhoto ? `${process.env.BASE_URL}${photographerDetails.basicInfo.profilePhoto}` : "";

            if (adminRating && adminRating.photographerId && adminRating.photographerId.basicInfo) {
                adminRating.photographerId.basicInfo.profilePhoto = avatar;
            }

            return res.status(200).json({
                success: true,
                overallAverageRating: Number(overallAverage.toFixed(2)),
                userAverageRating: Number(userAverage.toFixed(2)),
                adminAverageRating: Number(adminRatingValue.toFixed(2)),
                // Keeping existing fields for backward compatibility
                averageRating: Number(userAverage.toFixed(2)),
                totalUserRatings: ratings.length,
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
