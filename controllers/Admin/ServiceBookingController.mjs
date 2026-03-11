import ServiceBooking from "../../models/ServiceBookings.mjs";
import Gallery from "../../models/Gallery.mjs";
import Photographer from "../../models/Photographer.mjs";
import PlatformSettings from "../../models/PlatformSettings.mjs";
import Message from "../../models/Message.mjs";


const parseDDMMYYYY = (dateStr) => {
  if (!dateStr || dateStr instanceof Date) return dateStr;

  // Custom DD-MM-YYYY format (e.g., 20-03-2026)
  const bits = dateStr.split("-");
  if (bits.length === 3) {
    const [d, m, y] = bits;
    // If first part is 4 digits, it's likely YYYY-MM-DD, use standard parsing
    if (d.length === 4) return new Date(dateStr);
    // Otherwise assume DD-MM-YYYY and rearrange for JS Date
    return new Date(`${y}-${m}-${d}`);
  }

  return new Date(dateStr);
};
class ServiceBookingController {
  /**
   * Create a new service booking
   * POST /api/admins/bookings
   */
  async create(req, res, next) {
    try {
      const payload = req.body;
      payload.bookingDate = parseDDMMYYYY(payload.bookingDate);

      // Get last booking
      const lastBooking = await ServiceBooking
        .findOne({ veroaBookingId: { $exists: true } })
        .sort({ createdAt: -1 })
        .select("veroaBookingId");

      let nextNumber = 1;

      if (lastBooking?.veroaBookingId) {
        // Example: VEROA-BK-000001 → extract 000001
        const lastNumber = parseInt(
          lastBooking.veroaBookingId.split("-").pop(),
          10
        );
        nextNumber = lastNumber + 1;
      }

      // Pad number to 6 digits
      const formattedNumber = String(nextNumber).padStart(6, "0");

      payload.veroaBookingId = `VEROA-BK-${formattedNumber}`;

      if (payload.startDate && payload.startDate === payload.endDate) {
        payload.bookingDate = parseDDMMYYYY(payload.startDate);
        payload.endDate = "";
        payload.startDate = "";
      }

      const booking = await ServiceBooking.create(payload);

      return res.status(201).json({
        success: true,
        data: booking,
      });

    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get all service bookings with pagination
   * GET /api/admins/bookings
   */
  async list(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      let filter = {};
      if (req.query.fromDate && req.query.toDate) {
        const fromDate = new Date(req.query.fromDate);
        fromDate.setUTCHours(0, 0, 0, 0);
        const toDate = new Date(req.query.toDate);
        toDate.setUTCHours(23, 59, 59, 999);
        const fromStr = fromDate.toISOString().split("T")[0];
        const toStr = toDate.toISOString().split("T")[0];

        filter.$or = [
          { bookingDate: { $gte: fromDate, $lte: toDate } },
          { startDate: { $gte: fromStr, $lte: toStr } },
        ];
      }

      const [items, total] = await Promise.all([
        ServiceBooking.find(filter)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .populate("service_id client_id photographer_id"),
        ServiceBooking.countDocuments(filter),
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
   * Get upcoming bookings (bookingDate >= today)
   * GET /api/admins/bookings/upcoming
   */
  // async getUpcoming(req, res, next) {
  //   try {
  //     const page = Math.max(1, parseInt(req.query.page) || 1);
  //     const limit = Math.max(1, parseInt(req.query.limit) || 20);
  //     const skip = (page - 1) * limit;

  //     const today = new Date();
  //     today.setHours(0, 0, 0, 0);

  //     let filter = {
  //       bookingDate: { $gte: today },
  //     };

  //     // Add date range filter if provided
  //     if (req.query.fromDate && req.query.toDate) {
  //       const fromDate = new Date(req.query.fromDate);
  //       const toDate = new Date(req.query.toDate);
  //       toDate.setHours(23, 59, 59, 999);

  //       filter.bookingDate = {
  //         $gte: fromDate,
  //         $lte: toDate,
  //       };
  //     }

  //     const [items, total] = await Promise.all([
  //       ServiceBooking.find(filter)
  //         .skip(skip)
  //         .limit(limit)
  //         .sort({ createdAt: -1 })
  //         .populate("service_id client_id photographer_id"),
  //       ServiceBooking.countDocuments(filter),
  //     ]);

  //     const formattedItems = items.map(booking => ({
  //       bookingId: booking._id,
  //       veroaBookingId: booking.veroaBookingId,
  //       client_id: booking.client_id ? booking.client_id._id : null,
  //       client_name: booking.client_id ? booking.client_id.username : "",
  //       assigned_photographer: booking.photographer_id ? booking.photographer_id.username : "",
  //       team_studio: booking.team || "",
  //       eventType: booking.shootType || "",
  //       eventDate: booking.bookingDate,
  //       location: booking.city || "",
  //       note: booking.notes || "",
  //       status: booking.status,
  //       date: "",
  //       bookingAmount: booking.totalAmount,
  //       paymenyMode: booking.paymentMode,
  //       paymentType: booking.paymentStatus,
  //       bookingStatus: booking.status,

  //     }));

  //     return res.json({
  //       success: true,
  //       data: formattedItems,
  //       meta: { total, page, limit },
  //     });
  //   } catch (err) {
  //     return next(err);
  //   }
  // }


  async getUpcoming(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      let filter = {};

      if (req.query.fromDate && req.query.toDate) {
        // 📅 Strict custom date range (overlapping safe logic)

        const fromDate = new Date(req.query.fromDate);
        fromDate.setUTCHours(0, 0, 0, 0);

        const toDate = new Date(req.query.toDate);
        toDate.setUTCHours(23, 59, 59, 999);

        const fromStr = fromDate.toISOString().split("T")[0];
        const toStr = toDate.toISOString().split("T")[0];

        filter = {
          $or: [
            { startDate: { $gte: fromStr, $lte: toStr } },
            { bookingDate: { $gte: fromDate, $lte: toDate } },
          ],
        };

      } else {
        // 📅 Upcoming from today (strict upcoming logic)
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split("T")[0];

        filter = {
          $or: [
            { endDate: { $gte: todayStr } },
            { bookingDate: { $gte: today } },
          ],
        };
      }

      const [items, total] = await Promise.all([
        ServiceBooking.find(filter)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .populate("service_id client_id photographer_id"),
        ServiceBooking.countDocuments(filter),
      ]);
      const formattedItems = items.map(booking => ({
        bookingId: booking._id,
        veroaBookingId: booking.veroaBookingId,
        client_id: booking.client_id?._id || null,
        client_name: booking.client_id?.username || "",
        assigned_photographer: booking.photographer_id?.basicInfo?.fullName || "",
        team_studio: booking.photographer_id?.professionalDetails?.team_studio || booking.team || "",
        eventType: booking.service_id?.serviceName || "",
        eventDate: booking.bookingDate,
        location: `${booking.flatOrHouseNo}, ${booking.streetName}, ${booking.landMark ? booking.landMark + ', ' : ''}${booking.city}, ${booking.state} - ${booking.postalCode}`,
        note: booking.notes || "",
        status: booking.status,
        date: booking.ist_bookingDate ? booking.ist_bookingDate.split(", ")[0] : (booking.startDate || "N/A"),
        time: (booking.ist_bookingDate && booking.ist_bookingDate !== "N/A") ? booking.ist_bookingDate.split(", ")[1] : "N/A",
        startDate: booking.startDate || null,
        endDate: booking.endDate || null,
        bookingAmount: booking.totalAmount,
        photographerAmount: booking.photographerAmount || 0,
        paymentMode: booking.paymentMode,
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.status,
      }));

      return res.json({
        success: true,
        data: formattedItems,
        meta: { total, page, limit },
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Something went wrong",
        error: error.message,
      });
    }

  }


  /**
   * Get previous bookings (bookingDate < today)
   * GET /api/admins/bookings/previous
   */
  async getPrevious(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      let filter = {};

      if (req.query.fromDate && req.query.toDate) {
        // 📅 Custom date range filter
        const fromDate = new Date(req.query.fromDate);
        fromDate.setUTCHours(0, 0, 0, 0);
        const toDate = new Date(req.query.toDate);
        toDate.setUTCHours(23, 59, 59, 999);
        const fromStr = fromDate.toISOString().split("T")[0];
        const toStr = toDate.toISOString().split("T")[0];

        filter.$or = [
          { bookingDate: { $gte: fromDate, $lte: toDate } },
          { startDate: { $gte: fromStr, $lte: toStr } },
        ];
      } else {
        // 📅 Previous bookings compared to today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split("T")[0];

        filter.$or = [
          { bookingDate: { $lt: today } },
          { startDate: { $lt: todayStr } },
        ];
      }

      const [items, total] = await Promise.all([
        ServiceBooking.find(filter)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .populate("service_id client_id photographer_id"),
        ServiceBooking.countDocuments(filter),
      ]);

      const formattedItems = items.map(booking => ({
        bookingId: booking._id,
        veroaBookingId: booking.veroaBookingId,
        client_id: booking.client_id?._id || null,
        client_name: booking.client_id?.username || "",
        assigned_photographer: booking.photographer_id?.basicInfo?.fullName || "",
        team_studio: booking.photographer_id?.professionalDetails?.team_studio || booking.team || "",
        eventType: booking.shootType || "",
        eventDate: booking.bookingDate,
        location: `${booking.flatOrHouseNo}, ${booking.streetName}, ${booking.landMark ? booking.landMark + ', ' : ''}${booking.city}, ${booking.state} - ${booking.postalCode}`,
        note: booking.notes || "",
        status: booking.status,
        date: booking.ist_bookingDate ? booking.ist_bookingDate.split(", ")[1] ? booking.ist_bookingDate.split(", ")[0] : booking.ist_bookingDate : (booking.startDate || "N/A"),
        time: (booking.ist_bookingDate && booking.ist_bookingDate.includes(", ")) ? booking.ist_bookingDate.split(", ")[1] : "N/A",
        startDate: booking.startDate || null,
        endDate: booking.endDate || null,
        bookingAmount: booking.totalAmount,
        photographerAmount: booking.photographerAmount || 0,
        paymentMode: booking.paymentMode,
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.status,
      }));

      return res.json({
        success: true,
        data: formattedItems,
        meta: { total, page, limit },
      });

    } catch (err) {
      return next(err);
    }
  }


  /**
   * Get single service booking by ID
   * GET /api/admins/bookings/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;

      const booking = await ServiceBooking.findById(id)
        .populate("service_id client_id photographer_id");

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "ServiceBooking not found"
        });
      }

      return res.json({
        success: true,
        data: booking
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Update service booking by ID
   * PUT /api/admins/bookings/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const payload = req.body;

      // Parse booking date if provided in DD-MM-YYYY format
      if (payload.bookingDate && typeof payload.bookingDate === 'string') {
        const parseDDMMYYYY = (dateStr) => {
          const [day, month, year] = dateStr.split("-");
          return new Date(`${year}-${month}-${day}`);
        };
        payload.bookingDate = parseDDMMYYYY(payload.bookingDate);
      }

      const booking = await ServiceBooking.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      }).populate("service_id client_id photographer_id");

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "ServiceBooking not found"
        });
      }

      return res.json({
        success: true,
        data: booking
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Delete service booking by ID
   * DELETE /api/admins/bookings/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;

      const booking = await ServiceBooking.findByIdAndUpdate(
        id,
        { status: "canceled" },
        { new: true }
      );

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "ServiceBooking not found"
        });
      }

      return res.json({
        success: true,
        message: "ServiceBooking canceled successfully",
        data: booking
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get bookings by status
   * GET /api/admins/bookings/status/:status
   */
  async getByStatus(req, res, next) {
    try {
      const { status } = req.params;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        ServiceBooking.find({ status })
          .skip(skip)
          .limit(limit)
          .sort({ bookingDate: 1 })
          .populate("service_id client_id photographer_id"),
        ServiceBooking.countDocuments({ status }),
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
   * Get bookings by client
   * GET /api/admins/bookings/client/:clientId
   */
  async getByClient(req, res, next) {
    try {
      const { clientId } = req.params;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        ServiceBooking.find({ client_id: clientId })
          .skip(skip)
          .limit(limit)
          .sort({ bookingDate: 1 })
          .populate("service_id client_id photographer_id"),
        ServiceBooking.countDocuments({ client_id: clientId }),
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
   * Get bookings by photographer
   * GET /api/admins/bookings/photographer/:photographerId
   */
  async getByPhotographer(req, res, next) {
    try {
      const { photographerId } = req.params;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        ServiceBooking.find({ photographer_id: photographerId })
          .skip(skip)
          .limit(limit)
          .sort({ bookingDate: 1 })
          .populate("service_id client_id photographer_id"),
        ServiceBooking.countDocuments({ photographer_id: photographerId }),
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
   * Assign photographer to a booking
   * PATCH /api/admins/bookings/:id/assign-photographer
   */
  async assignPhotographer(req, res, next) {
    try {
      const { photographerId, bookingId, photographerIds } = req.body;

      const updateData = {};

      // Handle the invitation list (broadcast replacement)
      if (photographerIds !== undefined && photographerIds.length > 0) {
        updateData.photographerIds = photographerIds;
        // If broadcasting/inviting many, it is not yet "accepted" by any specific person
        updateData.photographer_id = null;
        updateData.bookingStatus = "pending";
        updateData.status = "pending";
        updateData.photographerAmount = 0;
      }

      // Handle direct assignment
      if (photographerId !== undefined) {
        updateData.photographer_id = photographerId;

        if (photographerId) {
          // If assigning a specific person, clear other invitations
          updateData.photographerIds = [];
          // Direct assignment counts as already accepted
          updateData.bookingStatus = "accepted";
          updateData.status = "confirmed";
          updateData.acceptedAt = new Date(); // To enforce the 48hr rule later

          const [booking, photographer, settings] = await Promise.all([
            ServiceBooking.findById(bookingId),
            Photographer.findById(photographerId),
            PlatformSettings.findOne({ type: "commissions" })
          ]);

          if (booking && photographer) {
            const global = settings || { initio: 0, elite: 0, pro: 0 };
            const level = photographer.professionalDetails?.expertiseLevel || "INITIO";
            let commission = photographer.commissionPercentage;

            if (!commission) {
              if (level === "INITIO") commission = global.initio;
              else if (level === "ELITE") commission = global.elite;
              else if (level === "PRO") commission = global.pro;
            }
            updateData.photographerAmount = Math.round(booking.totalAmount * (1 - (commission || 0) / 100));
          }
        } else {
          // If clearing assignment, also clear the amount and reset statuses
          updateData.photographerAmount = 0;
          updateData.bookingStatus = "pending";
          updateData.status = "pending";
        }
      }

      const booking = await ServiceBooking.findByIdAndUpdate(
        bookingId,
        updateData,
        { new: true }
      ).populate("photographer_id");

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found"
        });
      }

      return res.json({
        success: true,
        message: "Photographer assigned successfully",
        data: booking
      });
    } catch (err) {
      return next(err);
    }
  }

  async getCompletedBookings(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const filter = {
        $or: [
          { paymentStatus: "fully paid" },
          { paymentStatus: "paid" }
        ]
      };

      const [items, total] = await Promise.all([
        ServiceBooking.find(filter)
          .skip(skip)
          .limit(limit)
          .sort({ bookingDate: -1 })
          .populate("service_id client_id photographer_id"),
        ServiceBooking.countDocuments(filter),
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
   * Get gallery by booking ID (Admin)
   * GET /api/admins/bookings/:id/gallery
   */
  async getGalleryByBookingId(req, res, next) {
    try {
      const { id } = req.params;
      const gallery = await Gallery.findOne({ booking_id: id });

      if (!gallery) {
        return res.status(404).json({
          success: false,
          message: "Gallery not found for this booking",
        });
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const galleryData = gallery.toObject();

      galleryData.gallery = galleryData.gallery.map(path =>
        path.startsWith("http") ? path : `${baseUrl}/${path.replace(/\\/g, "/").replace(/^\//, "")}`
      );

      return res.json({
        success: true,
        data: galleryData,
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get brief summary of all services booked by a customer
   * GET /api/admin/customers/:clientId/booked-services
   */
  async getCustomerServicesSummary(req, res, next) {
    try {
      const { clientId } = req.params;

      const bookings = await ServiceBooking.find({ client_id: clientId })
        .populate("service_id", "serviceName serviceDescription")
        .sort({ createdAt: -1 });

      const summary = bookings.map((booking) => ({
        serviceName: booking.service_id?.serviceName || "",
        cost: booking.totalAmount,
        description: booking.service_id?.serviceDescription || "",
        bookingDate: booking.bookingDate,
        status: booking.status,
      }));

      return res.json({
        success: true,
        data: summary,
      });
    } catch (err) {
      return next(err);
    }
  }
  async getServiceBookingsWithChatCount(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total, allUnreadCountData] = await Promise.all([
        ServiceBooking.aggregate([
          {
            $lookup: {
              from: "conversations",
              localField: "_id",
              foreignField: "bookingId",
              as: "conversation",
            },
          },
          { $addFields: { conversation: { $arrayElemAt: ["$conversation", 0] } } },
          {
            $lookup: {
              from: "messages",
              localField: "conversation._id",
              foreignField: "conversationId",
              as: "allMessages",
            },
          },
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
              messageCount: { $size: "$allMessages" },
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
          { $addFields: { service_id: { $arrayElemAt: ["$service_id", 0] } } },
          {
            $lookup: {
              from: "users",
              localField: "client_id",
              foreignField: "_id",
              as: "client_id",
            },
          },
          { $addFields: { client_id: { $arrayElemAt: ["$client_id", 0] } } },
          {
            $lookup: {
              from: "photographers",
              localField: "photographer_id",
              foreignField: "_id",
              as: "photographer_id",
            },
          },
          { $addFields: { photographer_id: { $arrayElemAt: ["$photographer_id", 0] } } },
          { $sort: { unreadCount: -1, "conversation.lastMessageAt": -1, createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              id: "$_id",
              "bookingId": "$veroaBookingId",
              "clientName": "$client_id.username",
              "eventType": "$service_id.serviceName",
              "eventDate": "$bookingDate",
              "eventLocation": {
                $concat: [
                  { $ifNull: ["$flatOrHouseNo", ""] }, ", ",
                  { $ifNull: ["$streetName", ""] }, ", ",
                  { $ifNull: ["$city", ""] }, ", ",
                  { $ifNull: ["$state", ""] }, " - ",
                  { $ifNull: ["$postalCode", ""] }
                ]
              },
              "bookingAmount": "$totalAmount",
              "photographerAmount": { $ifNull: ["$photographerAmount", 0] },
              "paymentMode": "$paymentMode",
              "bookingStatus": "$status",
              "paymentStatus": "$paymentStatus",
              "assignPhotographer": "$photographer_id.basicInfo.fullName",
              "team_studio": {
                $cond: {
                  if: { $gt: [{ $type: "$photographer_id" }, "missing"] },
                  then: { $ifNull: ["$photographer_id.professionalDetails.team_studio", ""] },
                  else: "$team"
                }
              },
              "unreadmessages": "$unreadCount",
            },
          },
        ]),
        ServiceBooking.countDocuments(),
        // Total Unread Bookings Count (Unique bookings with unread messages)
        Message.aggregate([
          { $match: { isAdminRead: false } },
          {
            $lookup: {
              from: "conversations",
              localField: "conversationId",
              foreignField: "_id",
              as: "conversation"
            }
          },
          { $unwind: "$conversation" },
          { $match: { "conversation.bookingId": { $ne: null } } },
          {
            $lookup: {
              from: "servicebookings",
              localField: "conversation.bookingId",
              foreignField: "_id",
              as: "booking"
            }
          },
          { $match: { "booking.0": { $exists: true } } },
          { $count: "count" }
        ])
      ]);

      const allUnreadCount = allUnreadCountData[0]?.count || 0;

      return res.json({
        success: true,
        allunreadcount: allUnreadCount,
        data: items,
        meta: { total, page, limit },
      });
    } catch (err) {
      return next(err);
    }
  }
}

export default new ServiceBookingController();