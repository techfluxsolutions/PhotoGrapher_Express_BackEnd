import ServiceBooking from "../../models/ServiceBookings.mjs";

class ServiceBookingController {
  // Create a new service booking
  async create(req, res, next) {
    try {

      const parseDDMMYYYY = (dateStr) => {
        if (!dateStr) return dateStr;
        const [day, month, year] = dateStr.split("-");
        return new Date(`${year}-${month}-${day}`);
      };


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
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        ServiceBooking.find({})
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        ServiceBooking.countDocuments(),
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
}

export default new ServiceBookingController();
