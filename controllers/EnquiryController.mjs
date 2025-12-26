import User from "../models/User.mjs";

class EnquiryController {
  async create(req, res, next) {
    try {
      const payload = req.body;
      const user = await User.create(payload);
      return res.status(201).json({ success: true, data: user });
    } catch (err) {
      return next(err);
    }
  }
}

export default new EnquiryController();
