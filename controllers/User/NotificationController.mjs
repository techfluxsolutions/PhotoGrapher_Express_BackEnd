import Notification from "../../models/Notification.mjs";

class NotificationController {
  async create(req, res, next) {
    try {
      const data = await Notification.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const data = await Notification.find().sort({ createdAt: -1 }).limit(20);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Notification.findById(id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Notification not found" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Notification.findByIdAndUpdate(id, req.body, { new: true });
      if (!data) {
        return res.status(404).json({ success: false, message: "Notification not found" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Notification.findByIdAndDelete(id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Notification not found" });
      }
      res.status(200).json({ success: true, message: "Notification deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

export default new NotificationController();
