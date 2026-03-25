import ServiceBooking from "../../models/ServiceBookings.mjs";
import Quote from "../../models/Quote.mjs";
import Payment from "../../models/Payment.mjs";
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
}

export default new MobileBookingController();
