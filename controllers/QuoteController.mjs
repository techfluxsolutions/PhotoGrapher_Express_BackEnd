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

  async list(req, res, next) {
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
}

export default new QuoteController();
