import mongoose from "mongoose";

const ContactUsSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: [true, "Full Name is required"],
        },
        email: {
            type: String,
            required: [true, "Email Address is required"],
        },
        phoneNumber: {
            type: String,
            required: [true, "Phone Number is required"],
        },
        message: {
            type: String,
            required: [true, "Message is required"],
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("ContactUs", ContactUsSchema);
