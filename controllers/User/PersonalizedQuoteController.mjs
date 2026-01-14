import PersonalizedQuote from "../../models/PersonalizedQuotes.mjs";

class PersonalizedQuoteController {
  // Create a new personalized quote
  async create(req, res, next) {
    try {
      const payload = req.body;
      const quote = await PersonalizedQuote.create(payload);
      return res.status(201).json({ success: true, data: quote });
    } catch (err) {
      return next(err);
    }
  }

  // List personalized quotes with pagination
  async getAll(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        PersonalizedQuote.find({})
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .populate("user_id serviceId"),
        PersonalizedQuote.countDocuments(),
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

  // Get single personalized quote by id
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const quote = await PersonalizedQuote.findById(id).populate(
        "user_id serviceId"
      );
      if (!quote) {
        return res
          .status(404)
          .json({ success: false, message: "PersonalizedQuote not found" });
      }
      return res.json({ success: true, data: quote });
    } catch (err) {
      return next(err);
    }
  }

  // Update personalized quote by id
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const payload = req.body;
      const quote = await PersonalizedQuote.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      });
      if (!quote) {
        return res
          .status(404)
          .json({ success: false, message: "PersonalizedQuote not found" });
      }
      return res.json({ success: true, data: quote });
    } catch (err) {
      return next(err);
    }
  }

  // Delete personalized quote by id
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const quote = await PersonalizedQuote.findByIdAndDelete(id);
      if (!quote) {
        return res
          .status(404)
          .json({ success: false, message: "PersonalizedQuote not found" });
      }
      return res.json({ success: true, data: null });
    } catch (err) {
      return next(err);
    }
  }
}

export default new PersonalizedQuoteController();
