import mongoose from "mongoose";

const photographerSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: false,
      unique: true,
      trim: true,
      lowercase: true,
      sparse: true,
    },
    mobileNumber: {
      type: String,
      required: [true, "Mobile number is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*\.\w{2,}$/i,
        "Please enter a valid email",
      ],
    },
    isPhotographer: {
      type: Boolean,
      default: true,
    },
    // ===== Basic Information =====
    basicInfo: {
      fullName: { type: String, default: "" },
      displayName: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      profilePhoto: { type: String, default: "" } // URL to profile photo
    },

    // ===== Professional Details =====
    professionalDetails: {
      photographerType: { type: String, default: "" }, // e.g. Wedding, Fashion, Corporate
      expertiseLevel: {
        type: String,
        enum: ["Beginner", "Intermediate", "Professional", ""],
        default: ""
      },
      yearsOfExperience: { type: String, default: "" }, // e.g. 1-3, 3-5, 5+
      primaryLocation: { type: String, default: "" },
      willingToTravel: { type: Boolean, default: false },
      languagesSpoken: { type: [String], default: [] }
    },

    // ===== About You =====
    aboutYou: { type: String, default: "" },

    // ===== Services and Styles =====
    servicesAndStyles: {
      services: {
        weddingPhotography: { type: Boolean, default: false },
        preWeddingPhotography: { type: Boolean, default: false },
        fashionPhotography: { type: Boolean, default: false },
        corporatePhotography: { type: Boolean, default: false },
        eventPhotography: { type: Boolean, default: false },
        foodPhotography: { type: Boolean, default: false },
        productPhotography: { type: Boolean, default: false }
      },
      styles: {
        documentary: { type: Boolean, default: false },
        candid: { type: Boolean, default: false },
        editorial: { type: Boolean, default: false }
      }
    },

    // ===== Availability Settings =====
    availability: {
      status: { type: String, default: "" }, // e.g. Available, Busy, On Leave
      workingDays: { type: [String], default: [] }, // e.g. ["Monday", "Tuesday"]
      preferredTimeSlots: { type: [String], default: [] }, // e.g. ["Morning", "Evening"]
      maxBookingsPerDay: { type: Number, default: 1 }
    },

    // ===== Pricing Basics =====
    pricing: {
      startingPrice: { type: Number, default: null },
      currency: { type: String, default: "USD" },
      customQuotesEnabled: { type: Boolean, default: false }
    },

    // ===== Bank Details =====
    bank_account_holder: {
      type: String,
      required: [false, "Bank account holder name is required"], // Made optional for initial profile
    },
    bank_name: {
      type: String,
      // required: [true, "Bank name is required"]
    },
    bank_account_number: {
      type: String,
      // required: [true, "Bank account number is required"],
      match: [/^\d+$/, "Account number must contain only digits"],
    },
    bank_ifsc: {
      type: String,
      // required: [true, "IFSC code is required"],
      match: [/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, "Invalid IFSC code format (Example: HDFC0001234)"],
    },
    account_type: {
      type: String,
      enum: ["Savings", "Current"],
      // default: "Savings"
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "pending",
    },
    // storage_used_mb: {
    //   type: Number,
    //   default: 0,
    //   min: 0,
    // },
    calendar_availability: {
      type: String, // JSON string or URL to external calendar
      default: "{}",
    },
    password: {
      type: String,
      required: false,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,

    // ===== Equipment & Accessories =====
    photographyAccessories: [
      {
        name: { type: String, required: true },
        category: { type: String, required: true }, // e.g., Support, Lighting, Optics
      }
    ],
  },
  {
    timestamps: true,
    collection: "photographers",
  }
);

// Virtual: Full Name
photographerSchema.virtual("fullName").get(function () {
  return `${this.name}`;
});

// Index
// photographerSchema.index({ username: 1, email: 1, phone_number: 1 });
photographerSchema.index({ status: 1 });

export default mongoose.model("Photographer", photographerSchema);
