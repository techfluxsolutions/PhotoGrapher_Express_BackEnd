import User from "../models/User.mjs";
import { OAuth2Client } from "google-auth-library";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../utils/handleResponce.mjs";
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID ||
    "765306567020-0f5hdhfc7ee9vimttju996o6cg4eib2r.apps.googleusercontent.com"
);
class UserController {
  // Create a new user
  async create(req, res, next) {
    try {
      const { token } = req.body;
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const { name, email, picture } = ticket.getPayload();

      let user = await User.findOne({ email });

      if (!user) {
        user = await User.create({
          name,
          email,
          avatar: picture,
          loginType: "google",
        });
      }
      sendSuccessResponse(res, user);
      // const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      //   expiresIn: "7d",
      // });

      // res.json({ token: jwtToken, user });
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
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        User.find({}).skip(skip).limit(limit).sort({ enquiry_date: -1 }),
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

  // Get single user by id
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
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
      const user = await User.findByIdAndDelete(id);
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
