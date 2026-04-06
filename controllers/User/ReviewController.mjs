import ReviewAndRating from "../../models/ReviewAndRating.mjs";
import ServiceBooking from "../../models/ServiceBookings.mjs";
class ReviewController {
  async create(req, res, next) {
    try {
      const reviewData = { ...req.body };

      // Set createdBy manually based on authenticated user
      if (req.user) {
        reviewData.createdBy = req.user.isAdmin ? "admin" : (req.user.userType || "user");
        
        // If it's a user, ensure clientId matches the authenticated user
        if (reviewData.createdBy === "user") {
          reviewData.clientId = req.user.id;
        }
      }

      // Prevent duplicate review for same booking by same client
      if (reviewData.clientId && reviewData.bookingId) {
        const existingReview = await ReviewAndRating.findOne({
          clientId: reviewData.clientId,
          bookingId: reviewData.bookingId,
        });

        if (existingReview) {
          return res.status(409).json({
            success: false,
            message: "Review already submitted for this booking",
          });
        }
      }

      const data = await ReviewAndRating.create(reviewData);
      if (reviewData.bookingId && reviewData.ratingCount) {
        await ServiceBooking.findByIdAndUpdate(reviewData.bookingId, { 
            ratingsGivenByClient: reviewData.ratingCount / 2 
        });
      }
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
