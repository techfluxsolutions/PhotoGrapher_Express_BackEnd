import Review from "../../models/Review.mjs";

class ReviewController {
  async create(req, res, next) {
    try {
      const data = await Review.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const data = await Review.find();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Review.findById(id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Review not found" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Review.findByIdAndUpdate(id, req.body, { new: true });
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
      const data = await Review.findByIdAndDelete(id);
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
