import AdminDB from "../../models/Admin.mjs";

import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../utils/handleResponce.mjs";

class AdminController {
  async create(req, res, next) {
    try {
      const payload = req.body;
      if (req.file) {
        payload.avatar = req.file.path;
      }
      // Track creator if available
      if (req.user && req.user.id) {
        payload.createdBy = req.user.id;
      }
      const { email } = payload;
      const isEmailExist = await AdminDB.findOne({ email: email });
      if (isEmailExist) {
        return sendErrorResponse(res, "Email already exist", 400);
      }
      const admin = await AdminDB.create(payload);
      return sendSuccessResponse(res, admin, "Admin created", 201);
    } catch (err) {
      return sendErrorResponse(res, err.message, 500);
    }
  }

  async getAll(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        AdminDB.find({}).skip(skip).limit(limit).sort({ createdAt: -1 }),
        AdminDB.countDocuments(),
      ]);

      return res.json({
        success: true,
        data: items,
        meta: { total, page, limit },
      });
    } catch (err) {
      return sendErrorResponse(res, err.message, 500);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const admin = await AdminDB.findById(id);
      if (!admin)
        return res
          .status(404)
          .json({ success: false, message: "Admin not found" });
      return res.json({ success: true, data: admin });
    } catch (err) {
      return sendErrorResponse(res, err.message, 500);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const payload = req.body;
      const admin = await AdminDB.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      });
      if (!admin)
        return res
          .status(404)
          .json({ success: false, message: "Admin not found" });
      return res.json({ success: true, data: admin });
    } catch (err) {
      return sendErrorResponse(res, err.message, 500);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const admin = await AdminDB.findByIdAndDelete(id);
      if (!admin)
        return res
          .status(404)
          .json({ success: false, message: "Admin not found" });
      return res.json({ success: true, data: null });
    } catch (err) {
      return sendErrorResponse(res, err.message, 500);
    }
  }

  async changeStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return sendErrorResponse(res, "Status is required", 400);
      }

      // Validate status enum locally before DB call (optional but good practice)
      if (!["active", "inactive"].includes(status)) {
        return sendErrorResponse(res, "Invalid status. Use 'active' or 'inactive'", 400);
      }

      const admin = await AdminDB.findByIdAndUpdate(id, { status }, { new: true });

      if (!admin) {
        return sendErrorResponse(res, "Admin not found", 404);
      }

      return sendSuccessResponse(res, admin, "Admin status updated successfully", 200);
    } catch (err) {
      return sendErrorResponse(res, err.message, 500);
    }
  }
}

export default new AdminController();
