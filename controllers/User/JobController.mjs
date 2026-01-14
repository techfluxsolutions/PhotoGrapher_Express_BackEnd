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
      const data = await Job.find();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Job.findById(id);
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
      const data = await Job.findByIdAndUpdate(id, req.body, { new: true });
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
      const data = await Job.findByIdAndDelete(id);
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
