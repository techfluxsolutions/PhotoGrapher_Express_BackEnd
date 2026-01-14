import AdditionalServices from "../../models/AdditionalServices.mjs";

class AdditionalServicesController {
    // POST /additional-services
    async create(req, res, next) {
        try {
            const data = await AdditionalServices.create(req.body);

            res.status(201).json({
                success: true,
                data,
            });
        } catch (error) {
            next(error);
        }
    }

    // GET /additional-services
    async list(req, res, next) {
        try {
            const data = await AdditionalServices.find().populate("serviceId", "serviceName");

            res.status(200).json({
                success: true,
                data,
            });
        } catch (error) {
            next(error);
        }
    }

    // GET /additional-services/:id
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const data = await AdditionalServices.findById(id).populate("serviceId", "serviceName");

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: "Additional Service not found",
                });
            }

            res.status(200).json({
                success: true,
                data,
            });
        } catch (error) {
            next(error);
        }
    }

    // PUT /additional-services/:id
    async update(req, res, next) {
        try {
            const { id } = req.params;

            const data = await AdditionalServices.findByIdAndUpdate(id, req.body, {
                new: true,
                runValidators: true,
            });

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: "Additional Service not found",
                });
            }

            res.status(200).json({
                success: true,
                data,
            });
        } catch (error) {
            next(error);
        }
    }

    // DELETE /additional-services/:id
    async delete(req, res, next) {
        try {
            const { id } = req.params;
            const data = await AdditionalServices.findByIdAndDelete(id);

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: "Additional Service not found",
                });
            }

            res.status(200).json({
                success: true,
                message: "Additional Service deleted successfully",
            });
        } catch (error) {
            next(error);
        }
    }

    // GET /additional-services/service/:serviceId
    async getByServiceId(req, res, next) {
        try {
            const { serviceId } = req.params;
            const data = await AdditionalServices.find({ serviceId }).populate("serviceId", "serviceName");

            res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            next(error);
        }
    }
}

export default new AdditionalServicesController();
