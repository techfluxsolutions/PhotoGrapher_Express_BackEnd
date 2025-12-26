import Photographer from "../models/Photographer.mjs";
import bcrypt from "bcrypt";

class PhotographerController {
  async create(req, res, next) {
    try {
      const payload = req.body;
      if (payload.password) {
        payload.password = await bcrypt.hash(payload.password, 10);
      }
      const photographer = await Photographer.create(payload);
      return res.status(201).json({ success: true, data: photographer });
    } catch (err) {
      return next(err);
    }
  }

  async list(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        Photographer.find({}).skip(skip).limit(limit).sort({ createdAt: -1 }),
        Photographer.countDocuments(),
      ]);

      return res.json({
        success: true,
        data: items,
        meta: { total, page, limit },
      });
    } catch (err) {
      return next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const photographer = await Photographer.findById(id);
      if (!photographer)
        return res
          .status(404)
          .json({ success: false, message: "Photographer not found" });
      return res.json({ success: true, data: photographer });
    } catch (err) {
      return next(err);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const payload = req.body;
      const photographer = await Photographer.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      });
      if (!photographer)
        return res
          .status(404)
          .json({ success: false, message: "Photographer not found" });
      return res.json({ success: true, data: photographer });
    } catch (err) {
      return next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const photographer = await Photographer.findByIdAndDelete(id);
      if (!photographer)
        return res
          .status(404)
          .json({ success: false, message: "Photographer not found" });
      return res.json({ success: true, data: null });
    } catch (err) {
      return next(err);
    }
  }
}

export default new PhotographerController();
