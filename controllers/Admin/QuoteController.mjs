import Quote from "../../models/Quote.mjs";
import Message from "../../models/Message.mjs";
import Conversation from "../../models/Conversation.mjs";

class QuoteController {
  /**
   * Create a new quote
   * POST /api/admins/quotes
   */
  async create(req, res, next) {
    try {
      const payload = req.body;

      // Parse dates if needed (handle various date formats)
      const parseDateIfNeeded = (dateStr) => {
        if (!dateStr) return dateStr;
        if (dateStr instanceof Date) return dateStr;
        // Handle DD-MM-YYYY format
        if (typeof dateStr === 'string' && dateStr.includes('-')) {
          const parts = dateStr.split('-');
          if (parts[0].length === 2) {
            // DD-MM-YYYY format
            const [day, month, year] = parts;
            return new Date(`${year}-${month}-${day}`);
          }
        }
        return new Date(dateStr);
      };

      if (payload.startDate) {
        payload.startDate = parseDateIfNeeded(payload.startDate);
      }
      if (payload.endDate) {
        payload.endDate = parseDateIfNeeded(payload.endDate);
      }
      if (payload.eventDate) {
        payload.eventDate = parseDateIfNeeded(payload.eventDate);
      }

      if (payload.budget && !payload.currentBudget) {
        payload.currentBudget = payload.budget;
      }

      const quote = await Quote.create(payload);

      // Populate after creation
      const populatedQuote = await Quote.findById(quote._id)
        .populate("service_id clientId");

      return res.status(200).json({
        success: true,
        data: populatedQuote
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get all quotes with pagination
   * GET /api/admins/quotes
   */
  async list(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        Quote.find({ isQuoteFinal: true })
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .populate("service_id clientId"),
        Quote.countDocuments({ isQuoteFinal: true }),
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
   * Get quotes with status "yourQuotes"
   * GET /api/admins/quotes/your-quotes
   */
  async getYourQuotes(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        Quote.find({ quoteStatus: "yourQuotes" })
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .populate("service_id clientId"),
        Quote.countDocuments({ quoteStatus: "yourQuotes" }),
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
   * Get upcoming bookings (quoteStatus = "upcommingBookings")
   * GET /api/admins/quotes/upcoming-bookings
   */
  async getUpcomingBookings(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let filter = {
        quoteStatus: "upcommingBookings",
      };

      // Add date range filter if provided
      if (req.query.fromDate && req.query.toDate) {
        const fromDate = new Date(req.query.fromDate);
        const toDate = new Date(req.query.toDate);
        toDate.setHours(23, 59, 59, 999);

        filter.eventDate = {
          $gte: fromDate,
          $lte: toDate,
        };
      }

      const [items, total] = await Promise.all([
        Quote.find(filter)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .populate("service_id clientId"),
        Quote.countDocuments(filter),
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
   * Get previous bookings (quoteStatus = "previousBookings")
   * GET /api/admins/quotes/previous-bookings
   */
  async getPreviousBookings(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      let filter = {
        quoteStatus: "previousBookings",
      };

      // Add date range filter if provided
      if (req.query.fromDate && req.query.toDate) {
        const fromDate = new Date(req.query.fromDate);
        const toDate = new Date(req.query.toDate);
        toDate.setHours(23, 59, 59, 999);

        filter.eventDate = {
          $gte: fromDate,
          $lte: toDate,
        };
      }

      const [items, total] = await Promise.all([
        Quote.find(filter)
          .skip(skip)
          .limit(limit)
          .sort({ eventDate: -1 })
          .populate("service_id clientId"),
        Quote.countDocuments(filter),
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
   * Get single quote by ID
   * GET /api/admins/quotes/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;

      const quote = await Quote.findById(id)
        .populate("service_id clientId");

      if (!quote) {
        return res.status(404).json({
          success: false,
          message: "Quote not found"
        });
      }

      return res.json({
        success: true,
        data: quote
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Update quote by ID
   * PUT /api/admins/quotes/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const payload = req.body;

      // Parse dates if needed
      const parseDateIfNeeded = (dateStr) => {
        if (!dateStr) return dateStr;
        if (dateStr instanceof Date) return dateStr;
        // Handle DD-MM-YYYY format
        if (typeof dateStr === 'string' && dateStr.includes('-')) {
          const parts = dateStr.split('-');
          if (parts[0].length === 2) {
            const [day, month, year] = parts;
            return new Date(`${year}-${month}-${day}`);
          }
        }
        return new Date(dateStr);
      };

      if (payload.startDate) {
        payload.startDate = parseDateIfNeeded(payload.startDate);
      }
      if (payload.endDate) {
        payload.endDate = parseDateIfNeeded(payload.endDate);
      }
      if (payload.eventDate) {
        payload.eventDate = parseDateIfNeeded(payload.eventDate);
      }

      const existingQuote = await Quote.findById(id);
      if (!existingQuote) {
        return res.status(404).json({
          success: false,
          message: "Quote not found"
        });
      }

      // Budget negotiation logic
      if (payload.budget || payload.currentBudget) {
        const newBudget = payload.currentBudget || payload.budget;
        const currentEffectiveBudget = existingQuote.currentBudget || existingQuote.budget;
        if (currentEffectiveBudget && currentEffectiveBudget !== newBudget) {
          payload.previousBudget = currentEffectiveBudget;
        }
        if (!payload.currentBudget) payload.currentBudget = newBudget;
      }


      const quote = await Quote.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      }).populate("service_id clientId");

      if (!quote) {
        return res.status(404).json({
          success: false,
          message: "Quote not found"
        });
      }

      return res.json({
        success: true,
        data: quote
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Delete quote by ID
   * DELETE /api/admins/quotes/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;

      const quote = await Quote.findByIdAndDelete(id);

      if (!quote) {
        return res.status(404).json({
          success: false,
          message: "Quote not found"
        });
      }

      return res.json({
        success: true,
        message: "Quote deleted successfully",
        data: null
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get quotes by status
   * GET /api/admins/quotes/status/:status
   */
  async getByStatus(req, res, next) {
    try {
      const { status } = req.params;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      // Validate status
      const validStatuses = ["yourQuotes", "upcommingBookings", "previousBookings"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        });
      }

      const [items, total] = await Promise.all([
        Quote.find({ quoteStatus: status })
          .skip(skip)
          .limit(limit)
          .sort({ eventDate: -1 })
          .populate("service_id clientId"),
        Quote.countDocuments({ quoteStatus: status }),
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
   * Get quotes by client
   * GET /api/admins/quotes/client/:clientId
   */
  async getByClient(req, res, next) {
    try {
      const { clientId } = req.params;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        Quote.find({ clientId })
          .skip(skip)
          .limit(limit)
          .sort({ eventDate: -1 })
          .populate("service_id clientId"),
        Quote.countDocuments({ clientId }),
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
   * Get quotes by service
   * GET /api/admins/quotes/service/:serviceId
   */
  async getByService(req, res, next) {
    try {
      const { serviceId } = req.params;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        Quote.find({ service_id: serviceId })
          .skip(skip)
          .limit(limit)
          .sort({ eventDate: -1 })
          .populate("service_id clientId"),
        Quote.countDocuments({ service_id: serviceId }),
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
   * Get quotes by date range
   * GET /api/admins/quotes/date-range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
   */
  async getByDateRange(req, res, next) {
    try {
      const { startDate, endDate } = req.query;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Both startDate and endDate are required",
        });
      }

      const filter = {
        eventDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };

      const [items, total] = await Promise.all([
        Quote.find(filter)
          .skip(skip)
          .limit(limit)
          .sort({ eventDate: 1 })
          .populate("service_id clientId"),
        Quote.countDocuments(filter),
      ]);

      return res.json({
        success: true,
        data: items,
        meta: { total, page, limit, startDate, endDate },
      });
    } catch (err) {
      return next(err);
    }
  }
  async getQuries(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        Quote.find({ isQuoteFinal: false })
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .populate("service_id clientId"),
        Quote.countDocuments({ isQuoteFinal: false }),
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
  async getQuotesWithUnreadCount(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        Quote.aggregate([
          { $match: { isQuoteFinal: false } },
          {
            $lookup: {
              from: "conversations",
              localField: "_id",
              foreignField: "quoteId",
              as: "conversation",
            },
          },
          { $unwind: { path: "$conversation", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "messages",
              let: { convId: "$conversation._id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$conversationId", "$$convId"] },
                    isAdminRead: false,
                  },
                },
              ],
              as: "unreadMessages",
            },
          },
          {
            $addFields: {
              unreadCount: { $size: "$unreadMessages" },
            },
          },
          {
            $lookup: {
              from: "services",
              localField: "service_id",
              foreignField: "_id",
              as: "service_id",
            },
          },
          { $unwind: { path: "$service_id", preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: "users",
              localField: "clientId",
              foreignField: "_id",
              as: "clientId",
            },
          },
          { $unwind: { path: "$clientId", preserveNullAndEmptyArrays: true } },
          { $sort: { unreadCount: -1, "conversation.lastMessageAt": -1, createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              id: "$_id",
              eventType: { $ifNull: ["$service_id.serviceName", "$eventType", ""] },
              eventDate: { $ifNull: ["$eventDate", ""] },
              startDate: { $ifNull: ["$startDate", ""] },
              endDate: { $ifNull: ["$endDate", ""] },
              eventLocation: { $ifNull: ["$location", ""] },
              city: { $ifNull: ["$city", ""] },
              state: { $ifNull: ["$state", ""] },
              postalCode: { $ifNull: ["$postalCode", ""] },
              streetName: { $ifNull: ["$streetName", ""] },
              flatOrHouseNo: { $ifNull: ["$flatOrHouseNo", ""] },
              requirements: { $ifNull: ["$requirements", []] },
              currentBudget: {
                $cond: {
                  if: { $or: [{ $eq: ["$currentBudget", ""] }, { $not: ["$currentBudget"] }] },
                  then: { $ifNull: ["$budget", ""] },
                  else: "$currentBudget"
                }
              },
              previousBudget: { $ifNull: ["$previousBudget", ""] },
              budget: { $ifNull: ["$budget", ""] },
              name: { $ifNull: ["$clientId.username", "$clientName", ""] },
              phone: { $ifNull: ["$phoneNumber", ""] },
              email: { $ifNull: ["$email", ""] },
              unreadMessages: "$unreadCount",
              editingPreferences: { $ifNull: ["$editingPreferences", false] },
              quoteType: { $ifNull: ["$quoteType", ""] },
              eventDuration: { $ifNull: ["$eventDuration", ""] },
            },
          },
        ]),
        Quote.countDocuments({ isQuoteFinal: false }),
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


}

export default new QuoteController();
