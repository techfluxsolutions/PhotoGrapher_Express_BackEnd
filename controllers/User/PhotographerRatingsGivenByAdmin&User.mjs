import Rating from "../models/PhotographerRatingsGivenByAdminAndUser.js"
import User from "../models/User";
import Admin from "../models/Admin";
export const PhotographerRatingsGivenByAdminAndUser = {

    // ✅ CREATE

    getDetailsOfRatingGiver: async (id, tableName) => {
        let userDetails;
        if (tableName = 'user') {
            userDetails = await User.findById(id).select('name avatar');
        }
        if (tableName = 'admin') {
            userDetails = await Admin.findById(id).select('username avatar');
        }
        return null;
    },
    createRating: async (req, res) => {
        try {
            const isRatingExisted = await Rating.findOne({
                photographerId: req.body.photographerId,
                ratingGivenById: req.body.ratingGivenById,
            });
            if (isRatingExisted) {
                return res.status(400).json({
                    success: false,
                    message: "You have already rated this photographer"
                })
            }
            const data = await Rating.create(req.body);

            res.status(201).json({
                success: true,
                message: "Rating created successfully",
                data
            })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    },

    // ✅ READ ALL
    getAllRatings: async (req, res) => {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1)
            const limit = Math.max(1, parseInt(req.query.limit) || 10)

            const skip = (page - 1) * limit

            const [data, total] = await Promise.all([
                Rating.find()
                    .populate("photographerId").select('username avatar')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit).lean(),

                Rating.countDocuments()
            ])

            const dataWithUserDetails = data.map(async (item) => {
                const userDetails = await this.getDetailsOfRatingGiver(item.ratingGivenById, item.ratingGivenBy);
                return {
                    ...item,
                    userDetails: !userDetails ? null : userDetails
                }
            });

            res.status(200).json({
                success: true,
                message: "Ratings fetched successfully",
                data: dataWithUserDetails,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    },



    // ✅ READ BY ID
    getRatingById: async (req, res) => {
        try {
            const data = await Rating.findById(req.params.id)
                .populate("photographerId")

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: "Rating not found"
                })
            }

            res.json({ success: true, data })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    },

    // ✅ UPDATE
    updateRating: async (req, res) => {
        try {
            const data = await Rating.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            )

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: "Rating not found"
                })
            }

            res.json({
                success: true,
                message: "Rating updated successfully",
                data
            })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    },

    // ✅ DELETE
    deleteRating: async (req, res) => {
        try {
            const data = await Rating.findByIdAndDelete(req.params.id)

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: "Rating not found"
                })
            }

            res.json({
                success: true,
                message: "Rating deleted successfully"
            })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    },

    // ⭐ SPECIAL — FETCH BY ratingGivenBy (admin/user)
    getRatingsByGivenBy: async (req, res) => {
        try {
            const { ratingGivenBy } = req.params

            if (!["admin", "user"].includes(ratingGivenBy)) {
                return res.status(400).json({
                    success: false,
                    message: "ratingGivenBy must be 'admin' or 'user'"
                })
            }

            const data = await Rating.find({ ratingGivenBy })
                .populate("photographerId")

            res.json({
                success: true,
                count: data.length,
                data
            })
        } catch (error) {
            res.status(500).json({ success: false, error: error.message })
        }
    }

}