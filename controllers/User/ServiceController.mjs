import Service from "../../models/Service.mjs";
import AdditionalServices from "../../models/AdditionalServices.mjs";
import nineServices from "../../utils/Site_Static_Data/NineServices.mjs";
import Photographer from "../../models/Photographer.mjs";
class ServiceController {
  // POST /services
  async create(req, res, next) {
    try {
      if (req.file) {
        req.body.image = `/uploads/${req.file.filename}`;
      }
      const { serviceName, serviceDescription, serviceCost, isAdditionalServices, additionalServices } = req.body;
      const data = await Service.create(
        {
          serviceName,
          serviceDescription,
          serviceCost,
          isAdditionalServices,
          image: req.file ? `/uploads/${req.file.filename}` : null,
        }
      );

      if (isAdditionalServices) {
        additionalServices.forEach(async element => {
          await AdditionalServices.create({
            serviceId: data._id,
            serviceName: data.serviceName,
            serviceType: element.type,
            serviceDescription: element.description,
            serviceCost: element.cost,
          });
        });

        data.additionalServices = additionalServices;
      }

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
      //service name plus photographer profile data
      const serviceNames = await Service.find().select('serviceName');
      const photographerData = await Photographer.findOne().select('servicesAndStyles');

      if (!serviceNames || serviceNames.length === 0) {
        return res.status(404).json({
          success: true,
          message: "No Service are listed"
        })
      }

      const services = serviceNames.map(service => ({
        _id: service._id,
        serviceName: service.serviceName,
        key: service.serviceName
          .toLowerCase()
          .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) =>
            index === 0 ? match.toLowerCase() : match.toUpperCase()
          )
          .replace(/\s+/g, '')
      }));

      const styles = photographerData?.servicesAndStyles?.styles || {};
      const photographerServices = photographerData?.servicesAndStyles?.services || {};

      return res.status(200).json({
        message: "Service are fetched successfully",
        success: true,
        data: services,
        styles,
        photographerServices
      })
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message })
    }
  }

  async getServicePrice(req, res) {
    try {
      const { serviceId, additionalServicesId } = req.query;

      if (!serviceId) {
        return res.status(400).json({
          success: false,
          message: "serviceId is required"
        });
      }

      let servicePrice = null;

      // If additional service is provided → fetch from AdditionalServices
      if (additionalServicesId) {
        servicePrice = await AdditionalServices.findOne({
          _id: additionalServicesId,
          serviceId: serviceId
        }).select('serviceCost');
      }
      // Otherwise → fetch base service price
      else {
        servicePrice = await Service.findById(serviceId)
          .select('serviceCost');
      }

      return res.status(200).json({
        message: "Service price fetched successfully",
        success: true,
        data: servicePrice
      });

    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }


  async getServicePriceByServiceId(req, res) {
    try {
      const { serviceId } = req.params;
      const servicePrice = await Service.findById(serviceId).select('serviceCost');
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

  async uploadNineServices(req, res, next) {
    try {

      const data = await Service.insertMany(nineServices);
      return res.status(200).json({
        message: "Service are fetched successfully",
        success: true,
        data: data

      })
    } catch (error) {
      next(error);
    }
  }

  // GET /services/names-and-additional
  async getServiceNamesAndAdditional(req, res, next) {
    try {
      const data = await Service.find().select("serviceName isAdditionalServices");
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /services/additional/:serviceId
  async getAdditionalServicesByServiceId(req, res, next) {
    try {
      const { serviceId } = req.params;
      const data = await AdditionalServices.find({ serviceId });
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH /services/additional/:id
  async updateAdditionalService(req, res, next) {
    try {
      const { id } = req.params;
      const data = await AdditionalServices.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      });

      if (!data) {
        return res.status(404).json({
          success: false,
          message: "Additional service not found",
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
}

export default new ServiceController();