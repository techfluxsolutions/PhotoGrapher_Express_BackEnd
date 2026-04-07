import mongoose from "mongoose";
import ServiceBooking from "../../models/ServiceBookings.mjs";
import Quote from "../../models/Quote.mjs";
import Payment from "../../models/Payment.mjs";
import Counter from "../../models/Counter.mjs";
import Service from "../../models/Service.mjs";
import CloudPlan from "../../models/CloudPlans.mjs";
const parseDDMMYYYY = (dateStr) => {
  if (!dateStr) return dateStr;
  const [day, month, year] = dateStr.split("-");
  return new Date(`${year}-${month}-${day}`);
};

// this is for the mobile
class MobileBookingController {
  async create(req, res, next) {
    try {
      const payload = req.body;
      payload.bookingDate = parseDDMMYYYY(payload.bookingDate);

      // Get next booking sequence atomically
      const counter = await Counter.findByIdAndUpdate(
        "veroaBookingId",
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      const nextNumber = counter.seq;

      // Pad number to 6 digits
      const formattedNumber = String(nextNumber).padStart(6, "0");

      payload.veroaBookingId = `VEROA-BK-${formattedNumber}`;

      const booking = await ServiceBooking.create(payload);

      return res.status(201).json({
        success: true,
        data: booking,
      });

    } catch (err) {
      return next(err);
    }
  }

  // List service bookings with pagination
  async list(req, res, next) {
    try {
      const { id } = req.user;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        ServiceBooking.find({ client_id: id })
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .populate("service_id", "serviceName"),
        ServiceBooking.countDocuments({ client_id: id }),
      ]);

      const formattedItems = items.map((item) => {
        const doc = item.toObject();
        doc.eventType = item.shootType || item.service_id?.serviceName || "";
        return doc;
      });

      return res.json({
        success: true,
        data: formattedItems,
        meta: { total, page, limit },
      });
    } catch (err) {
      return next(err);
    }
  }

  // Get single service booking by id
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const booking = await ServiceBooking.findById(id).populate(
        "service_id client_id"
      );
      if (!booking) {
        return res
          .status(404)
          .json({ success: false, message: "ServiceBooking not found" });
      }
      return res.json({ success: true, data: booking });
    } catch (err) {
      return next(err);
    }
  }

  // Update service booking by id
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const payload = req.body;
      const booking = await ServiceBooking.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      });
      if (!booking) {
        return res
          .status(404)
          .json({ success: false, message: "ServiceBooking not found" });
      }
      return res.json({ success: true, data: booking });
    } catch (err) {
      return next(err);
    }
  }

  // Delete service booking by id
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const booking = await ServiceBooking.findByIdAndDelete(id);
      if (!booking) {
        return res
          .status(404)
          .json({ success: false, message: "ServiceBooking not found" });
      }
      return res.json({ success: true, data: null });
    } catch (err) {
      return next(err);
    }
  }

  async cancelBooking(req, res, next) {
    try {
      const { id } = req.params;

      const allowedFields = [
        "status",
        "cancellationCharge",
        "cancellationDate",
        "cancellationReason",
      ];

      const updates = {};
      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid fields provided for update",
        });
      }

      const booking = await ServiceBooking.findByIdAndUpdate(
        id,
        { $set: updates },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!booking) {
        return res
          .status(404)
          .json({ success: false, message: "ServiceBooking not found" });
      }

      return res.json({ success: true, data: booking });
    } catch (err) {
      return next(err);
    }
  }

  async updatePaymentStatusBooking(req, res, next) {
    try {
      const { id } = req.params;
      const payload = req.body;
      let booking;
      let quote;
      if (payload.bookingDate) {
        payload.bookingDate = parseDDMMYYYY(payload.bookingDate);
      }

      // Ensure paymentStatus, full_Payment, partial_Payment are synchronized
      if (
        payload.paymentStatus === "paid" ||
        payload.paymentStatus === "fully paid" ||
        payload.full_Payment === true ||
        (payload.outStandingAmount !== undefined && Number(payload.outStandingAmount) === 0 && payload.totalAmount)
      ) {
        payload.paymentStatus = "fully paid";
        payload.fullyPaidAt = new Date();
        payload.full_Payment = true;
        payload.partial_Payment = false;
        payload.outStandingAmount = 0;
      } else if (
        payload.paymentStatus === "partially paid" ||
        payload.partial_Payment === true ||
        (payload.outStandingAmount && Number(payload.outStandingAmount) > 0)
      ) {
        payload.paymentStatus = "partially paid";
        payload.partial_Payment = true;
        payload.full_Payment = false;
      }
      booking = await ServiceBooking.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      });
      if (!booking) {
        quote = await Quote.findByIdAndUpdate(id, payload, {
          new: true,
          runValidators: true,
        });
      }
      if (booking && booking !== null) {
        try {
          await Payment.create({
            user_id: booking.client_id,
            job_id: booking._id,
            quote_id: booking.quoteId || null,
            upfront_amount: payload.amount || payload.totalAmount || (booking.totalAmount - (payload.outStandingAmount || booking.outStandingAmount || 0)) || 0,
            outstanding_amount: payload.outStandingAmount || booking.outStandingAmount || 0,
            payment_status: (payload.paymentStatus === 'paid' || payload.paymentStatus === 'fully paid') ? 'paid' : 'pending',
            payment_date: new Date()
          });
        } catch (paymentErr) {
          console.error("Error creating payment record for booking:", paymentErr);
        }
        return res.json({ success: true, message: "Booking updated successfully", data: booking });
      }
      if (quote && quote !== null) {
        try {
          await Payment.create({
            user_id: quote.clientId,
            quote_id: quote._id,
            upfront_amount: payload.amount || payload.totalAmount || (quote.budget ? parseFloat(quote.budget) : 0) || 0,
            outstanding_amount: payload.outStandingAmount || 0,
            payment_status: (payload.paymentStatus === 'paid' || payload.paymentStatus === 'fully paid') ? 'paid' : 'pending',
            payment_date: new Date()
          });
        } catch (paymentErr) {
          console.error("Error creating payment record for quote:", paymentErr);
        }
        return res.json({ success: true, message: "Quote updated successfully", data: quote });
      }
      return res.status(404).json({ success: false, message: "Booking not found" });
    } catch (err) {
      return next(err);
    }
  }

  async getPreviousBookings(req, res, next) {
    try {
      const { id } = req.user;
      const bookings = await ServiceBooking.find({ client_id: id, status: "completed" }).populate("service_id", "serviceName");
      return res.json({ success: true, data: bookings });
    } catch (err) {
      return next(err);
    }
  }

  async getIncompleteBookings(req, res, next) {
    try {
      const { id } = req.user;
      const bookings = await ServiceBooking.find({ client_id: id, is_Incomplete: true });
      return res.json({ success: true, data: bookings });
    } catch (err) {
      return next(err);
    }
  }

  // Get Photographer Upcoming Bookings
  async getPhotographerUpcomingBookings(req, res, next) {
    try {
      const id = new mongoose.Types.ObjectId(req.user.id);
      const { eventType } = req.query; // New Filter
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const now = new Date();
      // Adjust to IST (UTC+5:30) for accurate Today/Tomorrow strings
      const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const todayStr = istTime.toISOString().split("T")[0];
      
      const tomorrowIST = new Date(istTime.getTime() + (24 * 60 * 60 * 1000));
      const tomorrowStr = tomorrowIST.toISOString().split("T")[0];

      // Convert Tomorrow 00:00 IST to a UTC Date object for MongoDB 'bookingDate'
      const tomorrowStartIST = new Date(`${tomorrowStr}T00:00:00.000+05:30`);

      const query = {
        $and: [
          {
            $or: [
              { photographer_id: id },
              { photographerIds: { $in: [id] } }
            ]
          },
          { status: { $nin: ["completed", "canceled"] } },
          { bookingStatus: "accepted" },
          {
            $or: [
              { bookingDate: { $gte: tomorrowStartIST } },      // Tomorrow or Future (Date object)
              { startDate: { $gte: tomorrowStr } }             // Tomorrow or Future (String)
            ]
          }
        ]
      };

      // Get counts for each service type based on photographer tasks (before applying filters)
      const allServices = await Service.find().select("serviceName");
      const serviceCounts = {};

      // Calculate counts for each service using countDocuments for consistency with the main query
      await Promise.all(allServices.map(async (service) => {
        const count = await ServiceBooking.countDocuments({
          $and: [
            ...query.$and,
            { service_id: service._id }
          ]
        });
        const key = service.serviceName.toLowerCase().replace(/\s/g, "");
        serviceCounts[key] = count;
      }));

      // Add Event Type Filter if provided (must happen AFTER counts used 'query')
      if (eventType) {
        const matchingServices = await Service.find({
          serviceName: { $regex: eventType, $options: "i" }
        }).select("_id");

        const serviceIds = matchingServices.map(s => s._id);

        query.$and.push({
          $or: [
            { shootType: { $regex: eventType, $options: "i" } },
            { service_id: { $in: serviceIds } }
          ]
        });
      }

      const [bookings, total] = await Promise.all([
        ServiceBooking.find(query)
          .sort({ startDate: 1, bookingDate: 1, createdAt: 1 }) // Priority sorting
          .populate("client_id", "username email mobileNumber avatar city")
          .populate("service_id", "serviceName")
          .skip(skip)
          .limit(limit),
        ServiceBooking.countDocuments(query)
      ]);

      const formattedBookings = bookings.map(booking => {
        // Simple IST formatter implementation
        let datePart = "N/A";
        let timePart = "N/A";
        const d = booking.bookingDate || (booking.startDate ? new Date(booking.startDate) : null);

        if (d) {
          const formatted = new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
          }).format(new Date(d)).toLowerCase();
          const parts = formatted.split(", ");
          datePart = parts[0];
          timePart = parts[1];
        }

        // Construct Venue if address is missing
        const displayAddress = booking.address || booking.location || ""

        return {
          _id: booking._id,
          bookingId: booking.veroaBookingId,
          clientName: booking.client_id?.username || "N/A",
          clientAvatar: booking.client_id?.avatar || null,
          eventType: booking.service_id?.serviceName || "N/A",
          date: datePart,
          time: timePart,
          city: booking.city,
          status: booking.status,
          bookingStatus: booking.bookingStatus,
          lat: booking.lat || null,
          lng: booking.lng || null,
          address: displayAddress,
          photographerAmount: booking.photographerAmount || 0
        };
      });

      return res.json({
        success: true,
        serviceCounts,
        data: formattedBookings,
        meta: { total, page, limit }
      });
    } catch (err) {
      return next(err);
    }
  }
}

export default new MobileBookingController();
