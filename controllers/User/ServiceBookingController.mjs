import ServiceBooking from "../../models/ServiceBookings.mjs";
const parseDDMMYYYY = (dateStr) => {
  if (!dateStr) return dateStr;
  const [day, month, year] = dateStr.split("-");
  return new Date(`${year}-${month}-${day}`);
};

class ServiceBookingController {
  // Create a new service booking
  async create(req, res, next) {
    try {
      const payload = req.body;
      payload.bookingDate = parseDDMMYYYY(payload.bookingDate);
      const booking = await ServiceBooking.create(payload);
      return res.status(201).json({ success: true, data: booking });
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
      if (payload.bookingDate) {
        payload.bookingDate = parseDDMMYYYY(payload.bookingDate);
      }
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
}

export default new ServiceBookingController();
