import Payment from "../models/Payment.mjs";

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
