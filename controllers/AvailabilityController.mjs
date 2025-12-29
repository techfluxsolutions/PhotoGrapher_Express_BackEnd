import Availability from "../models/Availability.mjs";

class AvailabilityController {
  async create(req, res, next) {
    try {
      const data = await Availability.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const data = await Availability.find();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Availability.findById(id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Availability not found" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Availability.findByIdAndUpdate(id, req.body, { new: true });
      if (!data) {
        return res.status(404).json({ success: false, message: "Availability not found" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Availability.findByIdAndDelete(id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Availability not found" });
      }
      res.status(200).json({ success: true, message: "Availability deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

export default new AvailabilityController();
