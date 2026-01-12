import Quote from "../models/Quote.mjs";

class QuoteController {
  async create(req, res, next) {
    try {
      const payload = req.body;
      const quote = await Quote.create(payload);
      return res.status(201).json({ success: true, data: quote });
    } catch (err) {
      return next(err);
    }
  }

  async getAll(req, res, next) {
    try {
      const { enquiryId, photographerId } = req.query;
      const filter = {};
      if (enquiryId) filter.job_id = enquiryId;
      if (photographerId) filter.photographer_id = photographerId;
      const items = await Quote.find(filter).sort({ createdAt: -1 });
      return res.json({ success: true, data: items });
    } catch (err) {
      return next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const quote = await Quote.findById(id);
      if (!quote) {
        return res
          .status(404)
          .json({ success: false, message: "Quote not found" });
      }
      return res.json({ success: true, data: quote });
    } catch (err) {
      return next(err);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const payload = req.body;
      const quote = await Quote.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      });
      if (!quote) {
        return res
          .status(404)
          .json({ success: false, message: "Quote not found" });
      }
      return res.json({ success: true, data: quote });
    } catch (err) {
      return next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const quote = await Quote.findByIdAndDelete(id);
      if (!quote) {
        return res
          .status(404)
          .json({ success: false, message: "Quote not found" });
      }
      return res.json({ success: true, data: null });
    } catch (err) {
      return next(err);
    }
  }
}

export default new QuoteController();
