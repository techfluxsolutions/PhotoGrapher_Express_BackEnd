import Job from "../../models/Job.mjs";

class JobController {
  async create(req, res, next) {
    try {
      const data = await Job.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const photographerId = req.user?.id;
      const filter = photographerId ? { assigned_photographer_id: photographerId } : {};
      const data = await Job.find(filter);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const photographerId = req.user?.id;
      const filter = { _id: id };
      if (photographerId) {
        filter.assigned_photographer_id = photographerId;
      }

      const data = await Job.findOne(filter);
      if (!data) {
        return res.status(404).json({ success: false, message: "Job not found" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const photographerId = req.user?.id;
      const filter = { _id: id };
      if (photographerId) {
        filter.assigned_photographer_id = photographerId;
      }

      const data = await Job.findOneAndUpdate(filter, req.body, { new: true });
      if (!data) {
        return res.status(404).json({ success: false, message: "Job not found" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const photographerId = req.user?.id;
      const filter = { _id: id };
      if (photographerId) {
        filter.assigned_photographer_id = photographerId;
      }

      const data = await Job.findOneAndDelete(filter);
      if (!data) {
        return res.status(404).json({ success: false, message: "Job not found" });
      }
      res.status(200).json({ success: true, message: "Job deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

export default new JobController();
