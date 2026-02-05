
import Photographer from "../../models/Photographer.mjs";

class PhotographerController {
    // get all photographers (Admin or Public listing)
    async getAllPhotographers(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.max(1, parseInt(req.query.limit) || 20);
            const skip = (page - 1) * limit;

            const items = await Photographer.find().skip(skip).limit(limit);
            const total = await Photographer.countDocuments();

            res.status(200).json({
                message: "Photographers fetched successfully",
                photographers: items,
                meta: { total, page, limit }
            });
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch photographers", error: error.message });
        }
    }

    // get photographer by id (Supports Admin/Public via :id, or Self via Auth)
    async getPhotographerById(req, res) {
        try {
            // Priority: Params ID (Admin/Public) -> Auth User ID (Self, 'id' from token) -> Auth Photographer ID
            const id = req.params.id || req.user?.id || req.user?._id || req.photographer?._id;

            if (!id) {
                return res.status(400).json({ message: "Photographer ID required" });
            }

            const photographer = await Photographer.findById(id);
            if (!photographer) {
                return res.status(404).json({ message: "Photographer not found" });
            }
            res.status(200).json({ message: "Photographer fetched successfully", photographer });
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch photographer", error: error.message });
        }
    }

    // create photographer (Admin Only - kept here for admin usage)
    async createPhotographer(req, res) {
        try {
            const payload = req.body;
            // Check if username already exists
            const existingUser = await Photographer.findOne({ username: payload.username });
            if (existingUser) {
                return res.status(400).json({ message: "Username already exists" });
            }
            const photographer = new Photographer(payload);
            await photographer.save();
            res.status(201).json({ message: "Photographer created successfully", photographer });
        } catch (error) {
            res.status(500).json({ message: "Failed to create photographer", error: error.message });
        }
    }

    // update photographer (Supports Admin via :id, or Self via Auth)
    async updatePhotographer(req, res) {
        try {
            // Priority: Params ID (Admin) -> Auth User ID (Self, 'id' from token) -> Auth Photographer ID
            const id = req.params.id || req.user?.id || req.user?._id || req.photographer?._id;

            if (!id) {
                return res.status(400).json({ message: "Photographer ID required" });
            }

            // Using findByIdAndUpdate with $set to handle updates. 
            // Since req.body might contain nested objects (basicInfo, etc.), Mongoose handles partial updates 
            // if we structure it right, or replaces the nested object if we pass the whole object.
            // For profile updates, passing the whole nested object (e.g. basicInfo) from frontend is standard.

            const photographer = await Photographer.findByIdAndUpdate(id, req.body, {
                new: true,
                runValidators: true
            });

            if (!photographer) {
                return res.status(404).json({ message: "Photographer not found" });
            }
            res.status(200).json({ message: "Photographer updated successfully", photographer });
        } catch (error) {
            res.status(500).json({ message: "Failed to update photographer", error: error.message });
        }
    }

    // delete photographer (Admin Only)
    async deletePhotographer(req, res) {
        try {
            const { id } = req.params;
            const photographer = await Photographer.findByIdAndDelete(id);
            if (!photographer) {
                return res.status(404).json({ message: "Photographer not found" });
            }
            res.status(200).json({ message: "Photographer deleted successfully", photographer });
        } catch (error) {
            res.status(500).json({ message: "Failed to delete photographer", error: error.message });
        }
    }
}

export default new PhotographerController();
