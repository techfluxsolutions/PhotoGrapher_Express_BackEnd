import Subscription from "../../models/Subscription.mjs";

class SubscriptionController {
  async create(req, res, next) {
    try {
      const data = await Subscription.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const data = await Subscription.find();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Subscription.findById(id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Subscription not found" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Subscription.findByIdAndUpdate(id, req.body, { new: true });
      if (!data) {
        return res.status(404).json({ success: false, message: "Subscription not found" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Subscription.findByIdAndDelete(id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Subscription not found" });
      }
      res.status(200).json({ success: true, message: "Subscription deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

export default new SubscriptionController();
