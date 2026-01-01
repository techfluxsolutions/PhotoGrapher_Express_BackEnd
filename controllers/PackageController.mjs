import Package from "../models/Package.mjs";

class PackageController {
  async create(req, res, next) {
    try {
      const data = await Package.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    console.log(req.user)
    try {
      const data = await Package.find();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Package.findById(id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Package not found" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Package.findByIdAndUpdate(id, req.body, { new: true });
      if (!data) {
        return res.status(404).json({ success: false, message: "Package not found" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Package.findByIdAndDelete(id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Package not found" });
      }
      res.status(200).json({ success: true, message: "Package deleted successfully" });
    } catch (error) {
      next(error);
    }
  }
}

export default new PackageController();
