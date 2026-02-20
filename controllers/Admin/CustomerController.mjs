import User from "../../models/User.mjs";
import ServiceBooking from "../../models/ServiceBookings.mjs";

class CustomerController {
  /**
   * Create a new customer
   * POST /api/admins/customers
   */
  async create(req, res, next) {
    try {
      const payload = req.body;

      // Parse date of birth if provided in DD-MM-YYYY format
      if (payload.dateOfBirth && typeof payload.dateOfBirth === 'string') {
        const parseDDMMYYYY = (dateStr) => {
          const parts = dateStr.split('-');
          if (parts[0].length === 2) {
            const [day, month, year] = parts;
            return new Date(`${year}-${month}-${day}`);
          }
          return new Date(dateStr);
        };
        payload.dateOfBirth = parseDDMMYYYY(payload.dateOfBirth);
      }

      // Check if mobile number already exists
      const existingUser = await User.findOne({ mobileNumber: payload.mobileNumber });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Mobile number already exists",
        });
      }

      // Check if email already exists (if provided)
      if (payload.email) {
        const existingEmail = await User.findOne({ email: payload.email });
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: "Email already exists",
          });
        }
      }

      const user = await User.create(payload);

      return res.status(201).json({
        success: true,
        data: user
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get all customers with pagination
   * GET /api/admins/customers
   */
  async list(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      // Optional filter by userType
      const filter = {};
      if (req.query.userType) {
        filter.userType = req.query.userType;
      }

      const [items, total] = await Promise.all([
        User.find(filter)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .select('-password -otp -otpExpiresAt'), // Exclude sensitive fields
        User.countDocuments(filter),
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
   * Get single customer by ID
   * GET /api/admins/customers/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;

      const user = await User.findById(id)
        .select('-password -otp -otpExpiresAt');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }

      // Fetch all bookings for this customer
      const bookings = await ServiceBooking.find({ client_id: id })
        .populate("service_id photographer_id")
        .sort({ createdAt: -1 });

      const userData = user.toObject();
      userData.bookings = bookings;
      userData.hasMultipleBookings = bookings.length > 1;

      return res.json({
        success: true,
        data: userData
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Update customer by ID
   * PUT /api/admins/customers/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const payload = req.body;

      // Parse date of birth if provided in DD-MM-YYYY format
      if (payload.dateOfBirth && typeof payload.dateOfBirth === 'string') {
        const parseDDMMYYYY = (dateStr) => {
          const parts = dateStr.split('-');
          if (parts[0].length === 2) {
            const [day, month, year] = parts;
            return new Date(`${year}-${month}-${day}`);
          }
          return new Date(dateStr);
        };
        payload.dateOfBirth = parseDDMMYYYY(payload.dateOfBirth);
      }

      // Check if mobile number is being changed and already exists
      if (payload.mobileNumber) {
        const existingUser = await User.findOne({
          mobileNumber: payload.mobileNumber,
          _id: { $ne: id }
        });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "Mobile number already exists",
          });
        }
      }

      // Check if email is being changed and already exists
      if (payload.email) {
        const existingEmail = await User.findOne({
          email: payload.email,
          _id: { $ne: id }
        });
        if (existingEmail) {
          return res.status(400).json({
            success: false,
            message: "Email already exists",
          });
        }
      }

      // Don't allow updating password, otp, or sensitive fields directly
      delete payload.password;
      delete payload.otp;
      delete payload.otpExpiresAt;

      const user = await User.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      }).select('-password -otp -otpExpiresAt');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }

      return res.json({
        success: true,
        data: user
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Delete customer by ID
   * DELETE /api/admins/customers/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;

      const user = await User.findByIdAndDelete(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Customer not found"
        });
      }

      return res.json({
        success: true,
        message: "Customer deleted successfully",
        data: null
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get customers by type (user, photographer, admin)
   * GET /api/admins/customers/type/:userType
   */
  async getByType(req, res, next) {
    try {
      const { userType } = req.params;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      // Validate userType
      const validTypes = ["user", "photographer", "admin"];
      if (!validTypes.includes(userType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid user type. Must be one of: ${validTypes.join(", ")}`,
        });
      }

      const [items, total] = await Promise.all([
        User.find({ userType })
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .select('-password -otp -otpExpiresAt'),
        User.countDocuments({ userType }),
      ]);

      return res.json({
        success: true,
        data: items,
        meta: { total, page, limit, userType },
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get verified customers
   * GET /api/admins/customers/verified
   */
  async getVerified(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        User.find({ isVerified: true })
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .select('-password -otp -otpExpiresAt'),
        User.countDocuments({ isVerified: true }),
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
   * Get unverified customers
   * GET /api/admins/customers/unverified
   */
  async getUnverified(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        User.find({ isVerified: false })
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .select('-password -otp -otpExpiresAt'),
        User.countDocuments({ isVerified: false }),
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
   * Search customers by name, email, or mobile
   * GET /api/admins/customers/search?q=searchTerm
   */
  async search(req, res, next) {
    try {
      const { q } = req.query;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: "Search query 'q' is required",
        });
      }

      const searchRegex = new RegExp(q, 'i');
      const filter = {
        $or: [
          { username: searchRegex },
          { email: searchRegex },
          { mobileNumber: searchRegex },
        ],
      };

      const [items, total] = await Promise.all([
        User.find(filter)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .select('-password -otp -otpExpiresAt'),
        User.countDocuments(filter),
      ]);

      return res.json({
        success: true,
        data: items,
        meta: { total, page, limit, query: q },
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get customers by location (state and/or city)
   * GET /api/admins/customers/location?state=Maharashtra&city=Pune
   */
  async getByLocation(req, res, next) {
    try {
      const { state, city } = req.query;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const filter = {};
      if (state) filter.state = state;
      if (city) filter.city = city;

      if (Object.keys(filter).length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one of 'state' or 'city' is required",
        });
      }

      const [items, total] = await Promise.all([
        User.find(filter)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .select('-password -otp -otpExpiresAt'),
        User.countDocuments(filter),
      ]);

      return res.json({
        success: true,
        data: items,
        meta: { total, page, limit, state, city },
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get customer statistics
   * GET /api/admins/customers/statistics
   */
  async getStatistics(req, res, next) {
    try {
      const stats = await User.aggregate([
        {
          $group: {
            _id: "$userType",
            count: { $sum: 1 },
          },
        },
      ]);

      const verificationStats = await User.aggregate([
        {
          $group: {
            _id: "$isVerified",
            count: { $sum: 1 },
          },
        },
      ]);

      const totalUsers = await User.countDocuments();

      return res.json({
        success: true,
        data: {
          byType: stats,
          byVerification: verificationStats,
          totalUsers,
        },
      });
    } catch (err) {
      return next(err);
    }
  }
}

export default new CustomerController();
