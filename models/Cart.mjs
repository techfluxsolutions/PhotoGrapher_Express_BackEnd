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

export default mongoose.model("Cart", cartSchema);