import mongoose from "mongoose";

const PartnerRegistrationSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: [true, "Full Name is required"],
        },
        employmentType: {
            type: String,
            enum: ["Freelancer", "Studio Owner", "Part Time", "Other"],
            required: [true, "Employment Type is required"],
        },
        phoneNumber: {
            type: String,
            validator: function (v) {
                return /^\d{10}$/.test(v);
            },
            message: props => `Given phone number is not valid!`,
            required: [true, "Phone Number is required"],
        },
        emailId: {
            type: String,
            validator: function (v) {
                return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
            },
            message: props => `Given email is not valid!`,
            required: [true, "Email Address is required"],
        },
        gender: {
            type: String,
            enum: ["Male", "Female", "Others"],
            required: [true, "Gender is required"],
        },
        city: {
            type: String,
            required: [true, "City is required"],
        },
        willingToTravel: {
            type: String,
            enum: ["Yes (Pan India)", "Yes (Selected Cities)", "No"],
            required: [true, "Willing to travel is required"],
        },
        professionalExpertise: {
            type: [String],
            enum: ["Photography", "Videography", "Cinematography", "Editing"],
            required: [true, "Professional Expertise is required"],
        },
        experience: {
            type: String,
            enum: ["0-2 Years", "3-5 Years", "6-10 Years", "10+ Years"],
            required: [true, "Experience is required"],
        },
        primaryServicesOffered: {
            type: [String],
            enum: [
                "Product Photography",
                "Commercial / Advertising Photography",
                "Corporate Photography",
                "Fashion / Lifestyle",
                "Food Photography",
                "Automobile Photography",
                "Sports Photography",
                "Industrial / Architecture",
                "Event Coverage",
                "Videography (Brand Films)",
                "Reels / Social Media Content",
                "Documentary / Interviews",
                "Editing / Post-production",
            ],
            required: [true, "Primary Services Offered is required"],
        },
        cameraGearsOwned: {
            type: String,
            required: [true, "Camera Gears Owned is required"],
        },
        comfortableWorkingUnderBrand: {
            type: String,
            enum: ["Yes", "No"],
            required: [true, "Comfortable working under our brand is required"],
        },
        gstRegistration: {
            type: String,
            enum: ["Available", "Not Available"],
            required: [true, "GST Registration is required"],
        },
        kycAvailable: {
            type: String,
            enum: ["Yes", "No"],
            required: [true, "PAN / Aadhaar Available for KYC is required"],
        },
        portfolioLinks: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("PartnerRegistration", PartnerRegistrationSchema);
