import User from "../../models/User.mjs";

class EnquiryController {
  async create(req, res, next) {
    try {
      const payload = req.body;
      const user = await User.create(payload);
      return res.status(201).json({ success: true, data: user });
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
        User.find({}).skip(skip).limit(limit).sort({ createdAt: -1 }),
        User.countDocuments(),
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
}

export default new EnquiryController();
