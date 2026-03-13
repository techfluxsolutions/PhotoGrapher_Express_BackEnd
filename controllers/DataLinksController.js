import DataLinks from "../models/DataLinks.js";
import mongoose from "mongoose";
class DataLinksController {
    // List all data links with pagination
    async getAll(req, res, next) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.max(1, parseInt(req.query.limit) || 20);
            const skip = (page - 1) * limit;
            const { bookingId, photographerId } = req.query;
            const clientId = req.user.id;
            if (!bookingId && !photographerId) {
                return res.status(400).json({
                    success: false,
                    message: "Booking ID or Photographer ID is required",
                });
            }

            // If no valid conditions were added, return empty result or handle error

            const [items, total] = await Promise.all([
                DataLinks.find({ bookingid: bookingId, photographerId: photographerId })
                    .skip(skip)
                    .limit(limit)
                    .sort({ _id: -1 })
                    .select('key'),
                DataLinks.countDocuments({ bookingid: bookingId, photographerId: photographerId }),
            ]);

            return res.status(200).json({
                success: true,
                data: items,
                meta: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                },
            });
        } catch (error) {
            next(error);
        }
    }

    // Get single data link by ID
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid Data Link ID format",
                });
            }
            const data = await DataLinks.findById(id).select('key')
            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: "Data Link not found",
                });
            }
            return res.status(200).json({
                success: true,
                data,
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new DataLinksController();
