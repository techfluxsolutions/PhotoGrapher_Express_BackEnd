import mongoose from "mongoose";

const faqSchema = new mongoose.Schema({
  question: {
    type: [
      {
        questionText: { type: String, required: true },
        answerText: { type: String, required: true },
      },
    ],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("FAQ", faqSchema);
