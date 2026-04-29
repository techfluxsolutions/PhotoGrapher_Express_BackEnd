//import HourlyService from "../../models/HourlyServies.mjs";
import fs from "fs";
import path from "path";

class HourlyServicesController {
    /**
     * Create a new hourly service
     * POST /api/admins/hourly-services
     */
    async createService(req, res, next) {
        try {
            const payload = req.body;

            // Handle cardDetails if they come as a JSON string
            if (typeof payload.cardDetails === 'string') {
                payload.cardDetails = JSON.parse(payload.cardDetails);
            }
            if (typeof payload.hourSection === 'string') {
                payload.hourSection = JSON.parse(payload.hourSection);
            }

            // If files are uploaded, map them to cardDetails
            if (req.files && req.files.length > 0) {
                // This assumes images are sent in order of cardDetails
                // A more robust way might be needed if they can update specific cards
                req.files.forEach((file, index) => {
                    if (payload.cardDetails[index]) {
                        payload.cardDetails[index].image = `/uploads/serviceImages/${file.filename}`;
                    }
                });
            }

            const service = await HourlyService.create(payload);

            return res.status(201).json({
                success: true,
                data: service
            });
        } catch (err) {
            return next(err);
        }
    }

    /**
     * Get all hourly services
     * GET /api/admins/hourly-services
     */
    async getAllServices(req, res, next) {
        try {
            const services = await HourlyService.find().sort({ createdAt: -1 });
            return res.json({
                success: true,
                data: services
            });
        } catch (err) {
            return next(err);
        }
    }

    /**
     * Get hourly service by ID
     * GET /api/admins/hourly-services/:id
     */
    async getServiceById(req, res, next) {
        try {
            const service = await HourlyService.findById(req.params.id);
            if (!service) {
                return res.status(404).json({
                    success: false,
                    message: "Hourly service not found"
                });
            }
            return res.json({
                success: true,
                data: service
            });
        } catch (err) {
            return next(err);
        }
    }

    /**
     * Update hourly service
     * PUT /api/admins/hourly-services/:id
     */
    async updateService(req, res, next) {
        try {
            const { id } = req.params;
            const payload = req.body;

            const existingService = await HourlyService.findById(id);
            if (!existingService) {
                return res.status(404).json({
                    success: false,
                    message: "Hourly service not found"
                });
            }

            if (typeof payload.cardDetails === 'string') {
                payload.cardDetails = JSON.parse(payload.cardDetails);
            }
            if (typeof payload.hourSection === 'string') {
                payload.hourSection = JSON.parse(payload.hourSection);
            }

            // If files are uploaded
            if (req.files && req.files.length > 0) {
                // Logic to handle which image belongs to which card
                // For simplicity, we'll look for 'cardImages' indices in payload or just use index
                // If the payload specifies which index to update, we use that.
                // Assuming payload.imageIndices = [0, 2] means file[0] goes to card[0], file[1] goes to card[2]
                let imageIndices = payload.imageIndices;
                if (typeof imageIndices === 'string') imageIndices = JSON.parse(imageIndices);

                req.files.forEach((file, i) => {
                    const cardIndex = (imageIndices && imageIndices[i] !== undefined) ? imageIndices[i] : i;

                    if (payload.cardDetails[cardIndex]) {
                        // Delete old image if exists
                        const oldImg = existingService.cardDetails[cardIndex]?.image;
                        if (oldImg) {
                            const fileName = oldImg.split('/').pop();
                            const fullPath = path.resolve(process.cwd(), "uploads/serviceImages", fileName);
                            if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
                        }
                        payload.cardDetails[cardIndex].image = `/uploads/serviceImages/${file.filename}`;
                    }
                });
            }

            const updatedService = await HourlyService.findByIdAndUpdate(id, payload, {
                new: true,
                runValidators: true,
            });

            return res.json({
                success: true,
                data: updatedService
            });
        } catch (err) {
            return next(err);
        }
    }

    /**
     * Delete hourly service
     * DELETE /api/admins/hourly-services/:id
     */
    async deleteService(req, res, next) {
        try {
            const { id } = req.params;
            const service = await HourlyService.findById(id);

            if (!service) {
                return res.status(404).json({
                    success: false,
                    message: "Hourly service not found"
                });
            }

            // Delete images from disk
            service.cardDetails.forEach(card => {
                if (card.image) {
                    const fileName = card.image.split('/').pop();
                    const fullPath = path.resolve(process.cwd(), "uploads/serviceImages", fileName);
                    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
                }
            });

            await HourlyService.findByIdAndDelete(id);

            return res.json({
                success: true,
                message: "Hourly service and associated images deleted successfully"
            });
        } catch (err) {
            return next(err);
        }
    }
}

export default new HourlyServicesController();
