import mongoose from "mongoose"

const cartItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ["service", "package", "duration", "editing", "shoot_team"],
    required: true
  },
  subCategoryName: {
    type: String,
  },
  subCategoryType: {
    type: String,
    enum: ["standard", "premium"],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    default: 1
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'onModel'
  },
  onModel: {
    type: String,
    required: false,
    enum: ["PhotographyPlan", "EditingPlan", "TeamShootPlan", "Package", "Service", "HourlyShootService"]
  },
  selectedroleId: {
    type: mongoose.Schema.Types.ObjectId,
  }
});

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  items: [cartItemSchema],
  totalAmount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ["active", "ordered", "cancelled", "completed"],
    default: "active"
  }
}, { timestamps: true });

cartSchema.pre("save", async function () {
  if (this.items && this.items.length > 0) {
    this.items.forEach(item => {
      if (item.category === "editing") item.onModel = "EditingPlan";
      else if (item.category === "shoot_team") item.onModel = "TeamShootPlan";
      else if (item.category === "package") item.onModel = "Package";
      else if (item.category === "service") item.onModel = "Service";
      else if (item.category === "hourly") item.onModel = "HourlyShootService";
      else item.onModel = "PhotographyPlan";
    });
  }
});

export default mongoose.model("Cart", cartSchema);