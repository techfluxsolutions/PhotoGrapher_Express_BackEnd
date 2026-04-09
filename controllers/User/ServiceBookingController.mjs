import ServiceBooking from "../../models/ServiceBookings.mjs";
import Quote from "../../models/Quote.mjs";
import Payment from "../../models/Payment.mjs";
import Photographer from "../../models/Photographer.mjs";
import Counter from "../../models/Counter.mjs";
const parseDDMMYYYY = (dateStr) => {
  if (!dateStr) return dateStr;
  const [day, month, year] = dateStr.split("-");
  return new Date(`${year}-${month}-${day}`);
};

class ServiceBookingController {
  // Create a new service booking
  // async create(req, res, next) {
  //   try {
  //     const payload = req.body;
  //     payload.bookingDate = parseDDMMYYYY(payload.bookingDate);

  //     // take last document from the database and get the booking id
  //     const veroaLastBookingId = await ServiceBooking.findOne().sort({ createdAt: -1 }).select('veroaBookingId')
  //     const veroaBookingId = veroaLastBookingId ? veroaLastBookingId.veroaBookingId + 1 : 1;
  //     payload.veroaBookingId = veroaBookingId;

  //     const booking = await ServiceBooking.create(payload);
  //     return res.status(201).json({ success: true, data: booking });
  //   } catch (err) {
  //     return next(err);
  //   }
  // }


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
      //  console.log(req.user)
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const now = new Date();
      const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const todayStr = istNow.toISOString().split("T")[0];
      const todayStartIST = new Date(`${todayStr}T00:00:00.000+05:30`);

      const query = { 
        client_id: id, 
        paymentStatus: { $ne: "pending" },
        $or: [
          { bookingDate: { $gte: todayStartIST } },
          { startDate: { $gte: todayStr } }
        ]
      };

      const [items, total] = await Promise.all([
        ServiceBooking.find(query)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .populate("service_id", "serviceName"),
        ServiceBooking.countDocuments(query),
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

      const photographer = await Photographer.findById(booking.photographer_id).select("basicInfo");

      if (!booking) {
        return res
          .status(404)
          .json({ success: false, message: "ServiceBooking not found" });
      }
      return res.json({ success: true, data: booking, photographer });
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

      // fields allowed to update
      const allowedFields = [
        "status",
        "cancellationCharge",
        "cancellationDate",
        "cancellationReason",
      ];

      // pick only allowed fields from payload
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

      const bookingFound = await ServiceBooking.findById(id);
      if (!bookingFound) {
        return res.status(404).json({ success: false, message: "ServiceBooking not found" });
      }

      if (bookingFound.bookingStatus === "accepted" && bookingFound.acceptedAt) {
        const acceptedTime = new Date(bookingFound.acceptedAt);
        const currentTime = new Date();
        const diffInHours = (currentTime - acceptedTime) / (1000 * 60 * 60);

        if (diffInHours > 48) {
          return res.status(200).json({
            success: false,
            message: "Booking cannot be canceled after 48 hours of acceptance",
          });
        }
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

  // update bookings
  async updatePaymentStatusBooking(req, res, next) {
    try {
      const { id } = req.params;
      const payload = req.body;
      
      console.log(`--- [updatePaymentStatusBooking] --- ID: ${id}`);
      console.log("Payload received:", JSON.stringify(payload, null, 2));

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
        // Create Payment record for booking
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
        // Create Payment record for quote
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
      const todayMidnight = new Date();
      todayMidnight.setUTCHours(0, 0, 0, 0);
      const todayStr = todayMidnight.toISOString().split("T")[0];

      // Previous bookings are those that are explicitly completed 
      // OR those whose date has already passed.
      const bookings = await ServiceBooking.find({
        client_id: id,
        status: { $ne: "canceled" },
        $or: [
          { status: "completed" },
          { bookingDate: { $lt: todayMidnight } },
          { startDate: { $lt: todayStr } }
        ]
      })
        .sort({ bookingDate: -1, createdAt: -1 }) // Show most recent past bookings first
        .populate("service_id", "serviceName");

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
  
  async reschedule(req, res, next) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.body;
      const { id: userId } = req.user;

      if (!startDate) {
        return res.status(400).json({ success: false, message: "startDate is required" });
      }

      // Find booking first to see if it exists
      const booking = await ServiceBooking.findById(id);

      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found" });
      }

      // Check authorization: Owner, Assigned Photographer, or Admin
      const isOwner = booking.client_id && booking.client_id.toString() === userId;
      const isAssignedPhotographer = booking.photographer_id && booking.photographer_id.toString() === userId;
      const isAdmin = req.user.isAdmin === true;

      if (!isOwner && !isAssignedPhotographer && !isAdmin) {
        return res.status(403).json({ 
          success: false, 
          message: "You are not authorized to reschedule this booking" 
        });
      }

      // Check if booking is in a state that allows rescheduling
      if (["completed", "canceled"].includes(booking.status)) {
        return res.status(400).json({ 
          success: false, 
          message: `Cannot reschedule a ${booking.status} booking` 
        });
      }

      // Update dates
      booking.startDate = startDate;
      if (endDate) booking.endDate = endDate;
      
      // Update the Date object as well for consistent querying
      booking.bookingDate = parseDDMMYYYY(startDate);

      await booking.save();

      return res.json({ 
        success: true, 
        message: "Booking rescheduled successfully", 
        data: booking 
      });
    } catch (err) {
      return next(err);
    }
  }
}

export default new ServiceBookingController();
