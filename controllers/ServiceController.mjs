import Service from "../models/Service.mjs";

class ServiceController {
  async create(req, res, next) {
    try {
      const data = await Service.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const data = await Service.find();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Service.findById(id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Service not found" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Service.findByIdAndUpdate(id, req.body, { new: true });
      if (!data) {
        return res.status(404).json({ success: false, message: "Service not found" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Service.findByIdAndDelete(id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Service not found" });
      }
      res.status(200).json({ success: true, message: "Service deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

export default new ServiceController();
