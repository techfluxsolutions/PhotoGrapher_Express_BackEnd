
import User from "../models/User.mjs";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../utils/handleResponce.mjs";

class UserController {
  // ✅ Create user
  async create(req, res, next) {
    try {
      const payload = req.body;

      // Optional: prevent duplicate email
      if (payload.email) {
        const existingUser = await User.findOne({ email: payload.email });
        if (existingUser) {
          return sendErrorResponse(res, 409, "User already exists");
        }
      }

      if (req.file) {
        payload.avatar = `/uploads/${req.file.filename}`;
      }

      const user = await User.create(payload);
      return sendSuccessResponse(res, user, "User created successfully");
    } catch (err) {
      return next(err);
    }
  }

  // ✅ List users with pagination
  async list(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        User.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
        User.countDocuments(),
      ]);

      return res.json({
        success: true,
        data: items,
        meta: { total, page, limit },
      });
    } catch (err) {
      return next(err);
    }
  }

  // ✅ Get user by ID
  async getById(req, res) {
    try {
      const { id } = req.user;
      console.log(id)
      const user = await User.findById(id).lean();
      console.log(user)
      if (!user || user === null) {
        return res.json({
          success: true,
          message: "User not found",
        });
      }
      const formatDate = (date) => {
        if (!date) return ''; // Handle null/undefined dates

        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const year = d.getFullYear(); // Full 4-digit year

        return `${day}/${month}/${year}`;
      };
      const userData = {
        username: user.username,
        mobileNumber: user.mobileNumber,
        avtar: user.avatar === "" ? "" : `${process.env.BASE_URL}${user.avatar}`,
        email: user.email,
        dateOfBirth: formatDate(user.dateOfBirth),
        langugage: user.langugage,
        userType: user.userType,
      }

      return res.json({
        success: true,
        data: userData,
      });
    } catch (err) {
      return res.json({
        success: false,
        error: err.message,
      });
    }
  }

  // ✅ Update user by ID
  async update(req, res) {
    try {
      const { id } = req.user;
      console.log(req.body);
      let updates = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (value === "" || value === null || value === undefined) {
          continue;
        }
        updates[key] = value;
      }

      if (req.file) {
        updates.avatar = `/uploads/userProfile/${req.file.filename}`;
      }

      console.log(updates);
      const user = await User.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      });

      if (!user) {
        return res.status(404).json({
          message: "User not found",
          success: false,
        });
      }

      return res.json({
        message: "User updated successfully",
        success: true,
        data: user,
      });
    } catch (err) {
      return res.status(500).json({
        message: err.message,
        success: false,
      })
    }
  }

  // ✅ Delete user by ID
  async delete(req, res, next) {
    try {
      const { id } = req.params;

      const user = await User.findByIdAndDelete(id);
      if (!user) {
        return sendErrorResponse(res, 404, "User not found");
      }

      return sendSuccessResponse(res, null, "User deleted successfully");
    } catch (err) {
      return next(err);
    }
  }
}

export default new UserController();
