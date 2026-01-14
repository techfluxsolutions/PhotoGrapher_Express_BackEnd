import Payment from "../../models/Payment.mjs";

class PaymentController {
  async create(req, res, next) {
    try {
      const payload = req.body;
      const payment = await Payment.create(payload);
      return res.status(201).json({ success: true, data: payment });
    } catch (err) {
      return next(err);
    }
  }

  async getAll(req, res, next) {
    try {
      const data = await Payment.find();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Payment.findById(id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Payment not found" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Payment.findByIdAndUpdate(id, req.body, { new: true });
      if (!data) {
        return res.status(404).json({ success: false, message: "Payment not found" });
      }
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const data = await Payment.findByIdAndDelete(id);
      if (!data) {
        return res.status(404).json({ success: false, message: "Payment not found" });
      }
      res.status(200).json({ success: true, message: "Payment deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  async refund(req, res, next) {
    try {
      const { id } = req.params;
      const payment = await Payment.findById(id);
      if (!payment)
        return res
          .status(404)
          .json({ success: false, error: "Payment not found" });
      payment.payment_status = "refunded";
      await payment.save();
      return res.json({ success: true, data: payment });
    } catch (err) {
      return next(err);
    }
  }
}

export default new PaymentController();
