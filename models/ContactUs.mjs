import mongoose from "mongoose";

const ContactUsSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: [true, "Full Name is required"],
        },
        email: {
            type: String,
            unique: true,
            validate: {
                validator: function (v) {
                    return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
                },
                message: props => `Given email is not valid!`
            },
            required: [true, "Email Address is required"],
        },
        phoneNumber: {
            type: String,
            validate: {
                validator: function (v) {
                    return /^\d{10}$/.test(v);
                },
                message: props => `phone number should be 10 digits!`
            },
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
