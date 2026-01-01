import FAQ from "../models/FAQs.mjs";
import { sendErrorResponse } from "../utils/handleResponce.mjs";

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
  async getAll(req, res, next) {
    try {
      const faqs = await FAQ.find({});
      if(!faqs){
        return res.status(404).json({ success: false, message: "FAQs not found" });
      }
      return res.json({
        success: true,
        data: faqs,  
      });
    } catch (err) {
      sendErrorResponse(res,err, 500)
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
