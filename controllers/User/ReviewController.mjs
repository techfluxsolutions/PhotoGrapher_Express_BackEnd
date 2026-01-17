import ReviewAndRating from "../../models/ReviewAndRating.mjs";

class ReviewController {
  async create(req, res, next) {
    try {
      const {
        clientId,
        photographerId,
        bookingId,
        serviceId,
        ratingCount,
        rateComments,
      } = req.body;

      // Prevent duplicate review for same booking by same client
      const existingReview = await ReviewAndRating.findOne({
        clientId,
        bookingId,
        serviceId,
      });

      if (existingReview) {
        return res.status(409).json({
          success: false,
          message: "Review already submitted for this booking",
        });
      }

      const data = await ReviewAndRating.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const data = await ReviewAndRating.find().sort({ createdAt: -1 });
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const data = await ReviewAndRating.find({ bookingId: id });
      if (!data) {
        return res.status(404).json({ success: false, message: "Review not foundd" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const data = await ReviewAndRating.findByIdAndUpdate(id, req.body, { new: true });
      if (!data) {
        return res.status(404).json({ success: false, message: "Review not found" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const data = await ReviewAndRating.findByIdAndDelete(id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Review not found" });
      }
      res.status(200).json({ success: true, message: "Review deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

export default new ReviewController();
