import Quote from "../models/Quote.mjs";

class QuoteController {
  async create(req, res, next) {
    try {
      const { id } = req.user;
      const payload = { ...req.body };

      // Helper to convert DD-MM-YYYY → Date
      const parseDDMMYYYY = (dateStr) => {
        if (!dateStr) return dateStr;
        const [day, month, year] = dateStr.split("-");
        return new Date(`${year}-${month}-${day}`);
      };

      // Convert date fields
      payload.startDate = parseDDMMYYYY(payload.startDate);
      payload.endDate = parseDDMMYYYY(payload.endDate);
      payload.eventDate = parseDDMMYYYY(payload.eventDate);
      payload.clientId = id;

      const quote = await Quote.create(payload);

      return res.status(201).json({
        success: true,
        data: quote,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }


  async getAll(req, res, next) {
    try {
      const id = req.user.id;
      // const { enquiryId, photographerId } = req.query;
      // const filter = {};
      // if (enquiryId) filter.job_id = enquiryId;
      // if (photographerId) filter.photographer_id = photographerId;
      const items = await Quote.find({ clientId: id }).sort({ createdAt: -1 });
      return res.json({ success: true, data: items });
    } catch (err) {
      return next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      // return res.json({ success: true, data: id });
      console.log("paramsß", req.params)
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
