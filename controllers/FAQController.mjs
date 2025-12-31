import FAQ from "../models/FAQs.mjs";

class FAQController {
  // Create a new FAQ
  async create(req, res, next) {
    try {
      const payload = req.body;
      const faq = await FAQ.create(payload);
      return res.status(201).json({ success: true, data: faq });
    } catch (err) {
      return next(err);
    }
  }

  // List FAQs with pagination
  async list(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        FAQ.find({}).skip(skip).limit(limit).sort({ createdAt: -1 }),
        FAQ.countDocuments(),
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

  // Get single FAQ by id
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const faq = await FAQ.findById(id);
      if (!faq) {
        return res
          .status(404)
          .json({ success: false, message: "FAQ not found" });
      }
      return res.json({ success: true, data: faq });
    } catch (err) {
      return next(err);
    }
  }

  // Update FAQ by id
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const payload = req.body;
      const faq = await FAQ.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      });
      if (!faq) {
        return res
          .status(404)
          .json({ success: false, message: "FAQ not found" });
      }
      return res.json({ success: true, data: faq });
    } catch (err) {
      return next(err);
    }
  }

  // Delete FAQ by id
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const faq = await FAQ.findByIdAndDelete(id);
      if (!faq) {
        return res
          .status(404)
          .json({ success: false, message: "FAQ not found" });
      }
      return res.json({ success: true, data: null });
    } catch (err) {
      return next(err);
    }
  }
}

export default new FAQController();
