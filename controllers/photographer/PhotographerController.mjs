
import {
    sendErrorResponse,
    sendSuccessResponse,
  } from "../../utils/handleResponce.mjs";

class PhotographerController {
    // get all photographers
    async getAllPhotographers(req, res) {
        try {
            const page = Math.max(1, parseInt(req.query.page) || 1);
            const limit = Math.max(1, parseInt(req.query.limit) || 20);
            const { items, total } = await PhotographerService.getAllPhotographers(page, limit);
            res.status(200).json({ message: "Photographers fetched successfully", photographers: items, meta: { total, page, limit } });
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch photographers", error: error.message });
        }
    }
    // get photographer by id
    async getPhotographerById(req, res) {
        try {
            const { id } = req.params;
            const photographer = await PhotographerService.getPhotographerById(id);
            if (!photographer) {
                return res.status(404).json({ message: "Photographer not found" });
            }
            res.status(200).json({ message: "Photographer fetched successfully", photographer });
        } catch (error) {
            res.status(500).json({ message: "Failed to fetch photographer", error: error.message });
        }
    }
    // create photographer
    async createPhotographer(req, res) {
        try {
            const payload = req.body;
            // Check if username already exists
            const existingUser = await PhotographerService.findByUsername(payload.username);
            if (existingUser) {
                return res.status(400).json({ message: "Username already exists" });
            }
            const photographer = await PhotographerService.createPhotographer(payload);
            res.status(201).json({ message: "Photographer created successfully", photographer });
        } catch (error) {
            res.status(500).json({ message: "Failed to create photographer", error: error.message });
        }
    }
    // update photographer
    async updatePhotographer(req, res) {
        try {
            const { id } = req.params;
            const photographer = await PhotographerService.updatePhotographer(id, req.body);
            if (!photographer) {
                return res.status(404).json({ message: "Photographer not found" });
            }
            res.status(200).json({ message: "Photographer updated successfully", photographer });
        } catch (error) {
            res.status(500).json({ message: "Failed to update photographer", error: error.message });
        }
    }
    // delete photographer
    async deletePhotographer(req, res) {
        try {
            const { id } = req.params;
            const photographer = await PhotographerService.deletePhotographer(id);
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
