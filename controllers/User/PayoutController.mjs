import Payout from "../../models/Payout.mjs";

class PayoutController {
  async create(req, res, next) {
    try {
      const data = await Payout.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const data = await Payout.find();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Payout.findById(id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Payout not found" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Payout.findByIdAndUpdate(id, req.body, { new: true });
      if (!data) {
        return res.status(404).json({ success: false, message: "Payout not found" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Payout.findByIdAndDelete(id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Payout not found" });
      }
      res.status(200).json({ success: true, message: "Payout deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

export default new PayoutController();
