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
            const query = { $or: [] };

            // Only add conditions if the parameters exist and are valid
            if (bookingId && bookingId.trim() !== "") {
                // bookingid is a String in schema
                query.$or.push({ bookingid: bookingId });
            }

            if (photographerId && mongoose.Types.ObjectId.isValid(photographerId)) {
                query.$or.push({ photographerId: new mongoose.Types.ObjectId(photographerId) });
            }

            // Add client conditions
            if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
                query.$or.push(
                    { clientId: new mongoose.Types.ObjectId(clientId) },
                    { photographerId: new mongoose.Types.ObjectId(clientId) }
                );
            }

            // If no valid conditions were added, return empty result or handle error
            if (query.$or.length === 0) {
                return res.status(200).json({
                    success: true,
                    data: [],
                    meta: {
                        total: 0,
                        page,
                        limit,
                        pages: 0
                    },
                });
            }
            const [items, total] = await Promise.all([
                DataLinks.find(query)
                    .skip(skip)
                    .limit(limit)
                    .sort({ _id: -1 })
                    .select('key'),
                DataLinks.countDocuments(query),
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
