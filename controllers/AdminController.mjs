import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../utils/handleResponce.mjs";

class AdminController {
  async create(req, res, next) {
    try {
      const payload = req.body;
      if (req.file) {
        payload.avatar = req.file.path;
      }
      const { email } = payload;
      const isEmailExist = await AdminService.findByEmail(email);
      if (isEmailExist) {
        return sendErrorResponse(res, "Email already exist", 400);
      }
      const admin = await AdminService.createAdmin(payload);
      return sendSuccessResponse(res, admin, "Admin created", 201);
    } catch (err) {
      return sendErrorResponse(res, err.message, 500);
    }
  }

  async list(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const { items, total } = await AdminService.getAllAdmins(page, limit);

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
      const admin = await AdminService.getAdminById(id);
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
      const admin = await AdminService.updateAdmin(id, payload);
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
      const admin = await AdminService.deleteAdmin(id);
      if (!admin)
        return res
          .status(404)
          .json({ success: false, message: "Admin not found" });
      return res.json({ success: true, data: null });
    } catch (err) {
      return sendErrorResponse(res, err.message, 500);
    }
  }
}

export default new AdminController();
