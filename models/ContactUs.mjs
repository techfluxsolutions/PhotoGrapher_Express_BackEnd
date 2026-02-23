import mongoose from "mongoose";

const ContactUsSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
        },
        email: {
            type: String,
            validate: {
                validator: function (v) {
                    // Only validate if email is provided
                    if (!v) return true;
                    return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
                },
                message: props => `Given email is not valid!`
            },
        },
        phoneNumber: {
            type: String,
            validate: {
                validator: function (v) {
                    // Only validate if phone number is provided
                    if (!v) return true;
                    return /^\d{10}$/.test(v);
                },
                message: props => `phone number should be 10 digits!`
            },
        },
        message: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("ContactUs", ContactUsSchema);
