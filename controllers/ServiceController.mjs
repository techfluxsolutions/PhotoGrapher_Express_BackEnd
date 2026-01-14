import Service from "../models/Service.mjs";
import AdditionalServices from "../models/AdditionalServices.mjs";
class ServiceController {
  // POST /services
  async create(req, res, next) {
    try {
      if (req.file) {
        req.body.image = `/uploads/${req.file.filename}`;
      }

      const data = await Service.create(req.body);

      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /services
  async list(req, res, next) {
    try {
      const data = await Service.find();

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /services/:id
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Service.findById(id).lean();

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }
      if (data && data.isAdditionalServices) {
        const additionalServices = await AdditionalServices.find({ serviceId: data._id }).lean();
        data.additionalServices = additionalServices;
      }

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /services/:id
  async update(req, res, next) {
    try {
      const { id } = req.params;

      if (req.file) {
        req.body.image = `/uploads/${req.file.filename}`;
      }

      const data = await Service.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true, // optional but recommended
      });

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
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

  // DELETE /services/:id
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Service.findByIdAndDelete(id);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Service deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }


  //user APIS to get the service name only

  async getServiceNameOnly(req, res) {
    try {
      const serviceNames = await Service.find().select('serviceName');
      if (!serviceNames) {
        res.status(404).json({
          success: true,
          message: "No Service are listed"
        })
      }
      return res.status(200).json({
        message: "Service are fetched successfully",
        success: true,
        data: serviceNames

      })

    } catch (err) {
      return res.status(500).json({ success: false, message: err.message })
    }
  }

  async getServicePrice(req, res) {
    try {
      const { serviceId, additionalServicesId } = req.body;
      const servicePrice = await AdditionalServices.findOne({ _id: additionalServicesId, serviceId: serviceId, }).select('serviceCost');
      if (!servicePrice) {
        res.status(404).json({
          success: true,
          message: "No Service are listed"
        })
      }
      return res.status(200).json({
        message: "Service are fetched successfully",
        success: true,
        data: servicePrice

      })

    } catch (err) {
      return res.status(500).json({ success: false, message: err.message })
    }
  }
}

export default new ServiceController();