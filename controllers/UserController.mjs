import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../utils/handleResponce.mjs";

class UserController {
  // Create a new user (Google Auth flow kept as is for now, but logic moved)
  async create(req, res, next) {
    try {
      const { token } = req.body;
      const { name, email, picture } = await UserService.verifyGoogleToken(token);

      let user = await UserService.findUserByEmail(email);

      if (!user) {
        user = await UserService.createGoogleUser(name, email, picture);
      }
      sendSuccessResponse(res, user);
    } catch (err) {
      res
        .status(401)
        .json({ message: "Google authentication failed", err: err.message });
    }
  }

  // List users with simple pagination
  async list(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      
      const { items, total } = await UserService.getAllUsers(page, limit);

      return res.json({
        success: true,
        data: items,
        meta: { total, page, limit },
      });
    } catch (err) {
      return next(err);
    }
  }

  // Get single user by id
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await UserService.getUserById(id);
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      return res.json({ success: true, data: user });
    } catch (err) {
      return next(err);
    }
  }

  // Update user by id
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const payload = req.body;

      if (req.file) {
        payload.avatar = `/uploads/${req.file.filename}`;
      }

      const user = await User.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      });
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      return res.json({ success: true, data: user });
    } catch (err) {
      return next(err);
    }
  }

  // Delete user by id
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const user = await UserService.deleteUser(id);
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      return res.json({ success: true, data: null });
    } catch (err) {
      return next(err);
    }
  }
}

export default new UserController();
