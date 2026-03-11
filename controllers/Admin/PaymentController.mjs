import Payment from "../../models/Payment.mjs";

class PaymentController {
  /**
   * Create a new payment
   * POST /api/admins/payments
   */
  async create(req, res, next) {
    try {
      const payload = req.body;

      // Parse payment date if provided in DD-MM-YYYY format
      if (payload.payment_date && typeof payload.payment_date === 'string') {
        const parseDDMMYYYY = (dateStr) => {
          const parts = dateStr.split('-');
          if (parts[0].length === 2) {
            const [day, month, year] = parts;
            return new Date(`${year}-${month}-${day}`);
          }
          return new Date(dateStr);
        };
        payload.payment_date = parseDDMMYYYY(payload.payment_date);
      }

      const payment = await Payment.create(payload);

      // Populate after creation
      const populatedPayment = await Payment.findById(payment._id)
        .populate("user_id quote_id job_id");

      return res.status(201).json({
        success: true,
        data: populatedPayment
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get all payments with pagination
   * GET /api/admins/payments
   */
  async list(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        Payment.find({})
          .skip(skip)
          .limit(limit)
          .sort({ payment_date: -1 })
          .populate("user_id quote_id job_id"),
        Payment.countDocuments(),
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

  /**
   * Get single payment by ID
   * GET /api/admins/payments/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;

      const payment = await Payment.findById(id)
        .populate("user_id quote_id job_id");

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found"
        });
      }

      return res.json({
        success: true,
        data: payment
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Update payment by ID
   * PUT /api/admins/payments/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const payload = req.body;

      // Parse payment date if provided in DD-MM-YYYY format
      if (payload.payment_date && typeof payload.payment_date === 'string') {
        const parseDDMMYYYY = (dateStr) => {
          const parts = dateStr.split('-');
          if (parts[0].length === 2) {
            const [day, month, year] = parts;
            return new Date(`${year}-${month}-${day}`);
          }
          return new Date(dateStr);
        };
        payload.payment_date = parseDDMMYYYY(payload.payment_date);
      }

      const payment = await Payment.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      }).populate("user_id quote_id job_id");

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found"
        });
      }

      return res.json({
        success: true,
        data: payment
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Delete payment by ID
   * DELETE /api/admins/payments/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;

      const payment = await Payment.findByIdAndDelete(id);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment not found"
        });
      }

      return res.json({
        success: true,
        message: "Payment deleted successfully",
        data: null
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get payments by status
   * GET /api/admins/payments/status/:status
   */
  async getByStatus(req, res, next) {
    try {
      const { status } = req.params;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      // Validate status
      const validStatuses = ["pending", "paid", "failed", "refunded"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        });
      }

      const [items, total] = await Promise.all([
        Payment.find({ payment_status: status })
          .skip(skip)
          .limit(limit)
          .sort({ payment_date: -1 })
          .populate("user_id quote_id job_id"),
        Payment.countDocuments({ payment_status: status }),
      ]);

      return res.json({
        success: true,
        data: items,
        meta: { total, page, limit, status },
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get pending payments
   * GET /api/admins/payments/pending
   */
  async getPending(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        Payment.find({ payment_status: "pending" })
          .skip(skip)
          .limit(limit)
          .sort({ payment_date: -1 })
          .populate("user_id quote_id job_id"),
        Payment.countDocuments({ payment_status: "pending" }),
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

  /**
   * Get completed payments (paid)
   * GET /api/admins/payments/completed
   */
  async getCompleted(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        Payment.find({ payment_status: "paid" })
          .skip(skip)
          .limit(limit)
          .sort({ payment_date: -1 })
          .populate("user_id quote_id job_id"),
        Payment.countDocuments({ payment_status: "paid" }),
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

  /**
   * Get payments by user
   * GET /api/admins/payments/user/:userId
   */
  async getByUser(req, res, next) {
    try {
      const { userId } = req.params;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        Payment.find({ user_id: userId })
          .skip(skip)
          .limit(limit)
          .sort({ payment_date: -1 })
          .populate("user_id quote_id job_id"),
        Payment.countDocuments({ user_id: userId }),
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

  /**
   * Get payments by date range
   * GET /api/admins/payments/date-range?fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD
   */
  async getByDateRange(req, res, next) {
    try {
      const { fromDate, toDate } = req.query;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          message: "Both fromDate and toDate are required",
        });
      }

      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);

      const filter = {
        payment_date: {
          $gte: startDate,
          $lte: endDate,
        },
      };

      const [items, total] = await Promise.all([
        Payment.find(filter)
          .skip(skip)
          .limit(limit)
          .sort({ payment_date: -1 })
          .populate("user_id quote_id job_id"),
        Payment.countDocuments(filter),
      ]);

      return res.json({
        success: true,
        data: items,
        meta: { total, page, limit, fromDate, toDate },
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get payment statistics
   * GET /api/admins/payments/statistics
   */
  async getStatistics(req, res, next) {
    try {
      const stats = await Payment.aggregate([
        {
          $group: {
            _id: "$payment_status",
            count: { $sum: 1 },
            totalUpfront: { $sum: "$upfront_amount" },
            totalOutstanding: { $sum: "$outstanding_amount" },
          },
        },
      ]);

      const totalPayments = await Payment.countDocuments();
      const totalRevenue = await Payment.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: { $add: ["$upfront_amount", "$outstanding_amount"] } },
          },
        },
      ]);

      return res.json({
        success: true,
        data: {
          byStatus: stats,
          totalPayments,
          totalRevenue: totalRevenue[0]?.total || 0,
        },
      });
    } catch (err) {
      return next(err);
    }
  }
}

export default new PaymentController();
