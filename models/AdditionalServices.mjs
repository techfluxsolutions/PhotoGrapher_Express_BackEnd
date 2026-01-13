import mongoose from "mongoose"


const AdditionalServicesSchema = new mongoose.Schema({
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true
    },
    serviceName: {
        type: String,
        required: true
    },
    serviceCost: {
        type: String,
        required: true
    },
    serviceType: {
        type: String,
    },
    description: {
        type: [String],

    }
});

// AdditionalServicesSchema.Index({ serviceId: 1 });

AdditionalServicesSchema.index({ username: 1, email: 1 });

export default mongoose.model("AdditionalServices", AdditionalServicesSchema);
