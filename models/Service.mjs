import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    serviceName: {
      type: String,
      required: true,
      index: true, // single-field index
    },
    serviceDescription: {
      type: String,
      // required: true,
    },
    serviceCost: {
      type: String,
      required: true,
      // index: true, // useful for filtering/sorting
    },
    isAdditionalServices: {
      type: Boolean,
      default: false
    },
    additionalServices: {
      type: [Object],
      ref: "AdditionalService",
      default: []
    }
  },
  { timestamps: true }
);

/* 🔍 Text search index */
serviceSchema.index({
  serviceName: "text",
  serviceDescription: "text",
});

/* ⚡ Compound index (optional) */
serviceSchema.index({
  serviceName: 1,
  serviceCost: 1,
});

export default mongoose.model("Service", serviceSchema);
