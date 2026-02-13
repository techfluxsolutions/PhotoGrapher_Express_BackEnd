import Quote from "../../models/Quote.mjs";
import ServiceBooking from "../../models/ServiceBookings.mjs";
class QuoteController {
  async create(req, res, next) {
    try {
      const { id } = req.user;
      const payload = { ...req.body };

      // Helper to convert DD-MM-YYYY → Date
      const parseDDMMYYYY = (dateStr) => {
        if (!dateStr) return dateStr;
        const [day, month, year] = dateStr.split("-");
        return new Date(`${year}-${month}-${day}`);
      };

      // Convert date fields
      payload.startDate = parseDDMMYYYY(payload.startDate);
      payload.endDate = parseDDMMYYYY(payload.endDate);
      payload.eventDate = parseDDMMYYYY(payload.eventDate);
      payload.clientId = id;

      const quote = await Quote.create(payload);

      return res.status(201).json({
        success: true,
        data: quote,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }


  async getAll(req, res, next) {
    try {
      const id = req.user.id;
      console.log("id", id)
      // const { enquiryId, photographerId } = req.query;
      // const filter = {};
      // if (enquiryId) filter.job_id = enquiryId;
      // if (photographerId) filter.photographer_id = photographerId;
      const items = await Quote.find({ clientId: id }).sort({ createdAt: -1 });
      return res.json({ success: true, data: items });
    } catch (err) {
      return next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      // return res.json({ success: true, data: id });
      console.log("paramsß", req.params)
      const quote = await Quote.findById(id);
      if (!quote) {
        return res
          .status(404)
          .json({ success: false, message: "Quote not found" });
      }
      return res.json({ success: true, data: quote });
    } catch (err) {
      return next(err);
    }
  }


  //

  async changeStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const quote = await Quote.findByIdAndUpdate(id, { quoteStatus: status }, {
        new: true,
        runValidators: true,
      });
      if (!quote) {
        return res
          .status(404)
          .json({ success: false, message: "Quote not found" });
      }
      return res.json({ success: true, data: quote });
    } catch (err) {
      return next(err);
    }
  }

  // getQoutes by status

  async getByStatus(req, res) {
    try {
      const { status } = req.params;

      const items = await Quote.find({ quoteStatus: status }).sort({ createdAt: -1 });
      return res.json({ success: true, data: items });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const payload = req.body;
      const quote = await Quote.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      });
      if (!quote) {
        return res
          .status(404)
          .json({ success: false, message: "Quote not found" });
      }
      return res.json({ success: true, data: quote });
    } catch (err) {
      return next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const quote = await Quote.findByIdAndDelete(id);
      if (!quote) {
        return res
          .status(404)
          .json({ success: false, message: "Quote not found" });
      }
      return res.json({ success: true, data: null });
    } catch (err) {
      return next(err);
    }
  }
  // async QuoteConverToBookings(req, res) {

  //   try {
  //     const { quoteId } = req.params;
  //     const { clientId, flatOrHouseNo, streetName, city, state, postalCode } = req.body; // or from req.user._id if using auth

  //     // 🔎 Step 1: Find quote by _id AND clientId
  //     const quote = await Quote.findOne({
  //       _id: quoteId,
  //       clientId: clientId,
  //     });

  //     if (!quote) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "Quote not found or does not belong to this client",
  //       });
  //     }

  //     // 🧠 Step 2: Create booking using quote details
  //     const booking = await ServiceBooking.create({
  //       service_id: quote.service_id,
  //       client_id: quote.clientId,
  //       bookingDate: quote.eventDate,

  //       // Address mapping (can be updated later)
  //       flatOrHouseNo: flatOrHouseNo,
  //       streetName: streetName,
  //       city: city,
  //       state: state,
  //       postalCode: postalCode,

  //       totalAmount: quote.budget || 0,

  //       quoteId: quote._id,
  //       bookingSource: "quote",
  //     });

  //     // 🔄 Step 3: Update quote status
  //     quote.quoteStatus = "upcommingBookings";
  //     await quote.save();

  //     return res.status(201).json({
  //       success: true,
  //       message: "Booking created successfully from quote",
  //       data: booking,
  //     });

  //   } catch (error) {
  //     console.error("Create booking from quote error:", error);
  //     res.status(500).json({
  //       success: false,
  //       message: "Internal server error",
  //     });
  //   }
  // }

  async QuoteConverToBookings(req, res) {
    try {
      const { quoteId } = req.params;
      const {
        clientId,
        flatOrHouseNo,
        streetName,
        city,
        state,
        postalCode,
        totalAmount
      } = req.body;

      // 🔎 Step 1: Find quote by _id AND clientId
      const quote = await Quote.findOne({
        _id: quoteId,
        clientId: clientId,
      });
      console.log(clientId, quoteId);
      if (!quote) {
        return res.status(404).json({
          success: false,
          message: "Quote not found or does not belong to this client",
        });
      }

      const leanedData = quote.toObject();
      // 🆔 Generate VEROA Booking ID
      const lastBooking = await ServiceBooking
        .findOne({ veroaBookingId: { $exists: true } })
        .sort({ createdAt: -1 })
        .select("veroaBookingId");

      let nextNumber = 1;

      if (lastBooking?.veroaBookingId) {
        const lastNumber = parseInt(
          lastBooking.veroaBookingId.split("-").pop(),
          10
        );
        nextNumber = lastNumber + 1;
      }

      const formattedNumber = String(nextNumber).padStart(6, "0");
      const veroaBookingId = `VEROA-BK-${formattedNumber}`;

      // 🧠 Step 2: Create booking using quote details
      const booking = await ServiceBooking.create({
        veroaBookingId: veroaBookingId,

        service_id: quote.service_id,
        client_id: quote.clientId,
        bookingDate: leanedData?.eventDate,
        startDate: leanedData.startDate,
        endDate: leanedData.endDate,

        // Address mapping
        flatOrHouseNo,
        streetName,
        city,
        state,
        postalCode,
        totalAmount: totalAmount,
        quoteId: quote._id,
        bookingSource: "quote",
      });

      // 🔄 Step 3: Update quote status
      quote.quoteStatus = "upcommingBookings";
      await quote.save();

      return res.status(201).json({
        success: true,
        message: "Booking created successfully from quote",
        data: booking,
      });

    } catch (error) {
      console.error("Create booking from quote error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }


}

export default new QuoteController();






