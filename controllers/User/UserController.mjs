
import User from "../../models/User.mjs";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../../utils/handleResponce.mjs";

class UserController {
  // ✅ Create user
  async create(req, res, next) {
    try {
      const payload = req.body;

      // Optional: prevent duplicate email
      if (payload.email && payload.email.trim() !== "") {
        const existingUser = await User.findOne({ email: payload.email });
        if (existingUser) {
          return sendErrorResponse(res, 409, "User already exists");
        }
      } else {
        // Remove empty email string to avoid collision with sparse unique index
        delete payload.email;
      }

      if (req.file) {
        payload.avatar = `/uploads/${req.file.filename}`;
      }

      const user = await User.create(payload);
      return sendSuccessResponse(res, user, "User created successfully");
    } catch (err) {
      return next(err);
    }
  }

  // ✅ List users with pagination
  async list(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        User.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
        User.countDocuments(),
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

  // ✅ Get user by ID
  async getById(req, res) {
    try {
      const { id } = req.user;
      console.log(id)
      const user = await User.findById(id).lean();
      console.log(user)
      if (!user || user === null) {
        return res.json({
          success: true,
          message: "User not found",
        });
      }
      const formatDate = (date) => {
        if (!date) return ''; // Handle null/undefined dates

        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const year = d.getFullYear(); // Full 4-digit year

        return `${day}/${month}/${year}`;
      };
      const userData = {
        username: user.username,
        mobileNumber: user.mobileNumber,
        avtar: user.avatar === "" ? "" : `${process.env.BASE_URL}${user.avatar}`,
        email: user.email,
        dateOfBirth: formatDate(user.dateOfBirth),
        langugage: user.langugage,
        userType: user.userType,
        city: user.city,
        state: user.state,
        country: user.country,
      }

      return res.json({
        success: true,
        data: userData,
      });
    } catch (err) {
      return res.json({
        success: false,
        error: err.message,
      });
    }
  }

  // ✅ Update user by ID
  //   async update(req, res) {
  //     try {
  //       const { id } = req.user;
  //       console.log(req.body);
  //       const allowedFields = ["username", "email", "mobileNumber", "state", "city"];
  //       let updates = {};

  //       for (const field of allowedFields) {
  //         if (req.body[field] !== undefined) {
  //           const value = req.body[field];

  //           // Basic empty check (already requested)
  //           if (value === "" || value === null || value === undefined) {
  //             if(field === "username"){
  //               return res.status(400).json({
  //                 success: false,
  //                 message: `Full Name cannot be empty`,
  //               });
  //             }
  //             const capitalizedKey = field.charAt(0).toUpperCase() + field.slice(1);
  //             return res.status(400).json({
  //               success: false,
  //               message: `${capitalizedKey} cannot be empty`,
  //             });
  //           }

  //           // Specific validation for email
  //           if (field === "email") {
  //             const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  //             if (!emailRegex.test(value)) {
  //               return res.status(400).json({
  //                 success: false,
  //                 message: "Please enter a valid email address",
  //               });
  //             }
  //           }

  //           // Specific validation for mobileNumber
  //           if (field === "mobileNumber") {
  //             const mobileRegex = /^\d{10}$/;
  //             if (!mobileRegex.test(value)) {
  //               return res.status(400).json({
  //                 success: false,
  //                 message: "Mobile number must be 10 digits",
  //               });
  //             }
  //           }

  //           updates[field] = value;
  //         }
  //       }

  //       if (req.file) {
  //         updates.avatar = `/uploads/userProfile/${req.file.filename}`;
  //       }

  //       console.log(updates);
  //       const user = await User.findByIdAndUpdate(id, updates, {
  //         new: true,
  //         runValidators: true,
  //       });

  //       if (!user) {
  //         return res.status(404).json({
  //           message: "User not found",
  //           success: false,
  //         });
  //       }

  //       return res.json({
  //         message: "User updated successfully",
  //         success: true,
  //         data: user,
  //       });
  //     } catch (err) {
  //   // ✅ Handle duplicate key error
  //   if (err.code === 11000) {
  //     const field = Object.keys(err.keyPattern)[0]; // e.g. "email"
  //     const capitalizedField = field.charAt(0).toUpperCase() + field.slice(1);

  //     return res.status(400).json({
  //       success: false,
  //       message: `${capitalizedField} already exists so please add another ${capitalizedField}`,
  //     });
  //   }

  //   // ✅ Handle mongoose validation (one-by-one error)
  //   if (err.name === "ValidationError") {
  //     const firstError = Object.values(err.errors)[0];
  //     const field = firstError.path.charAt(0).toUpperCase() + firstError.path.slice(1);

  //     return res.status(400).json({
  //       success: false,
  //       message: `Invalid ${field} format. ${firstError.message}`,
  //     });
  //   }

  //   // ❌ fallback
  //   return res.status(500).json({
  //     message: err.message,
  //     success: false,
  //   });
  // }
  // }


  async update(req, res) {
    try {
      const { id } = req.user;

      const allowedFields = [
        "username",
        "email",
        "mobileNumber",
        "state",
        "city",
      ];

      let updates = {};

      // ✅ Regex Validators
      const validators = {
        username: /^[A-Za-z\s]{2,50}$/,        // Only letters + spaces
        email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        mobileNumber: /^[6-9]\d{9}$/,          // Indian mobile number
        state: /^[A-Za-z\s]{2,50}$/,
        city: /^[A-Za-z\s]{2,50}$/,
      };

      //email is optional
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          let value = req.body[field];

          // Trim string values
          if (typeof value === "string") {
            value = value.trim();
          }

          // ✅ Empty check
          if (!value) {
            // If email is optional and empty, we UNSET it to allow clearing the field 
            // while avoiding collision with the sparse unique index
            if (field === "email") {
              if (!updates.$unset) updates.$unset = {};
              updates.$unset.email = 1;
              continue; 
            }

            let message = "";
            switch (field) {
              case "username":
                message = "Full Name cannot be empty";
                break;

              case "mobileNumber":
                message = "Mobile Number cannot be empty";
                break;

              case "state":
                message = "State cannot be empty";
                break;

              case "city":
                message = "City cannot be empty";
                break;

              default:
                message = `${field} cannot be empty`;
            }

            return res.status(400).json({
              success: false,
              message,
            });
          }
          //mobile number cannot be empty

          // ✅ Regex validation
          if (validators[field] && !validators[field].test(value)) {
            let message = "";

            switch (field) {
              case "username":
                message =
                  "Full Name must contain only letters and spaces (2–50 characters)";
                break;

              case "email":
                message = "Please enter a valid email address";
                break;

              case "mobileNumber":
                message =
                  "Mobile number must be a valid 10-digit Indian mobile number";
                break;

              case "state":
                message = "State must contain only letters";
                break;

              case "city":
                message = "City must contain only letters";
                break;
            }

            return res.status(400).json({
              success: false,
              message,
            });
          }

          updates[field] = value;
        }
      }

      // ✅ Avatar Upload
      if (req.file) {
        updates.avatar = `/uploads/userProfile/${req.file.filename}`;
      }

      const user = await User.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      return res.json({
        success: true,
        message: "User updated successfully",
        data: user,
      });
    } catch (err) {

      // ✅ Duplicate key error
      if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        const capitalizedField =
          field.charAt(0).toUpperCase() + field.slice(1);

        return res.status(400).json({
          success: false,
          message: `${capitalizedField} already exists so please add another ${capitalizedField}`,
        });
      }

      // ✅ Mongoose validation error
      if (err.name === "ValidationError") {
        const firstError = Object.values(err.errors)[0];
        const field =
          firstError.path.charAt(0).toUpperCase() +
          firstError.path.slice(1);

        return res.status(400).json({
          success: false,
          message: `Invalid ${field} format. ${firstError.message}`,
        });
      }

      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }
  // ✅ Delete user by ID
  async delete(req, res, next) {
    try {
      const { id } = req.params;

      const user = await User.findByIdAndDelete(id);
      if (!user) {
        return sendErrorResponse(res, 404, "User not found");
      }

      return sendSuccessResponse(res, null, "User deleted successfully");
    } catch (err) {
      return next(err);
    }
  }
}

export default new UserController();
