import mongoose from 'mongoose';
import dotenv from 'dotenv';
import TeamShootPlan from '../models/TeamShootPlan.mjs';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/photographer")
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

const seedData = [
    // --- STANDARD PLANS ---
    {
        teamCategory: "standard",
        role: "Photographer",
        pricingType: "duration_based",
        pricingOptions: [
            { durationText: "0-3 Hours", durationValue: 3, price: 3999 },
            { durationText: "5 Hours", durationValue: 5, price: 5999 },
            { durationText: "8 Hours", durationValue: 8, price: 8999 }
        ],
        features: [
            "Trained Photographer",
            "Unlimited Photographs",
            "All Raw Files & Photographs",
            "Digital Cloud Based Delivery (JPEG Format)",
            "Express Delivery (1-2 Days)"
        ],
        isBaseIncluded: true
    },
    {
        teamCategory: "standard",
        role: "Videographer",
        pricingType: "duration_based",
        pricingOptions: [
            { durationText: "0-3 Hours", durationValue: 3, price: 4999 },
            { durationText: "5 Hours", durationValue: 5, price: 6999 },
            { durationText: "8 Hours", durationValue: 8, price: 9999 }
        ],
        features: [
            "Trained Videographer",
            "Unlimited Videos and Clips",
            "All Raw Data delivered",
            "Digital Cloud Based Delivery",
            "Express Delivery (2-3 Days)"
        ],
        isBaseIncluded: false
    },
    {
        teamCategory: "standard",
        role: "Lighting Setup",
        pricingType: "fixed",
        fixedPrice: 1999,
        features: [
            "Professional Setup",
            "Ambient Lighting"
        ],
        isBaseIncluded: false
    },
    {
        teamCategory: "standard",
        role: "Editing",
        pricingType: "fixed",
        fixedPrice: 1199,
        features: [
            "Basic Editing",
            "Color Correction"
        ],
        isBaseIncluded: false
    },

    // --- PREMIUM PLANS ---
    {
        teamCategory: "premium",
        role: "Photographer",
        pricingType: "duration_based",
        pricingOptions: [
            { durationText: "0-3 Hours", durationValue: 3, price: 4999 },
            { durationText: "5 Hours", durationValue: 5, price: 7999 },
            { durationText: "8 Hours", durationValue: 8, price: 9999 }
        ],
        features: [
            "Professional Photographer",
            "Unlimited Quality Photographs",
            "All Raw Files & Edited Photographs",
            "Digital Cloud Based Delivery (JPEG Format)",
            "Instant Delivery (0-1 Days)"
        ],
        isBaseIncluded: true
    },
    {
        teamCategory: "premium",
        role: "Cinematographer",
        pricingType: "duration_based",
        pricingOptions: [
            { durationText: "0-3 Hours", durationValue: 3, price: 5999 },
            { durationText: "5 Hours", durationValue: 5, price: 8999 },
            { durationText: "8 Hours", durationValue: 8, price: 11999 }
        ],
        features: [
            "Professional Cinematographer",
            "Unlimited 1080p (HD) Videos and Clips",
            "All Raw Data delivered",
            "Digital Cloud Based Delivery",
            "Instant Delivery (0-1 Days)"
        ],
        isBaseIncluded: false
    },
    {
        teamCategory: "premium",
        role: "Lighting Setup",
        pricingType: "fixed",
        fixedPrice: 1999,
        features: [
            "Professional Lighting Team",
            "Studio level Setup"
        ],
        isBaseIncluded: false
    },
    {
        teamCategory: "premium",
        role: "Editing",
        pricingType: "fixed",
        fixedPrice: 1499,
        features: [
            "Advanced Editing",
            "Detailed Color Grading"
        ],
        isBaseIncluded: false
    }
];

const seedDB = async () => {
    try {
        await TeamShootPlan.deleteMany({});
        console.log("Old TeamShootPlans removed");

        await TeamShootPlan.insertMany(seedData);
        console.log("TeamShootPlans successfully seeded");
    } catch (error) {
        console.error("Error seeding data:", error);
    } finally {
        mongoose.connection.close();
        process.exit(0);
    }
};

seedDB();



//{
//     "plans": [
//         {
//             "teamCategory": "standard",
//             "role": "Photographer",
//             "pricingType": "duration_based",
//             "pricingOptions": [
//                 { "durationText": "0-3 Hours", "durationValue": 3, "price": 3999 },
//                 { "durationText": "5 Hours", "durationValue": 5, "price": 5999 },
//                 { "durationText": "8 Hours", "durationValue": 8, "price": 8999 }
//             ],
//             "features": [
//                 "Trained Photographer",
//                 "Unlimited Photographs",
//                 "All Raw Files & Photographs",
//                 "Digital Cloud Based Delivery (JPEG Format)",
//                 "Express Delivery (1-2 Days)"
//             ],
//             "isBaseIncluded": true
//         },
//         {
//             "teamCategory": "standard",
//             "role": "Videographer",
//             "pricingType": "duration_based",
//             "pricingOptions": [
//                 { "durationText": "0-3 Hours", "durationValue": 3, "price": 4999 },
//                 { "durationText": "5 Hours", "durationValue": 5, "price": 6999 },
//                 { "durationText": "8 Hours", "durationValue": 8, "price": 9999 }
//             ],
//             "features": [
//                 "Trained Videographer",
//                 "Unlimited Videos and Clips",
//                 "All Raw Data delivered",
//                 "Digital Cloud Based Delivery",
//                 "Express Delivery (2-3 Days)"
//             ],
//             "isBaseIncluded": false
//         },
//         {
//             "teamCategory": "standard",
//             "role": "Lighting Setup",
//             "pricingType": "fixed",
//             "fixedPrice": 1999,
//             "features": [
//                 "Professional Setup",
//                 "Ambient Lighting"
//             ],
//             "isBaseIncluded": false
//         },
//         {
//             "teamCategory": "standard",
//             "role": "Editing",
//             "pricingType": "fixed",
//             "fixedPrice": 1199,
//             "features": [
//                 "Basic Editing",
//                 "Color Correction"
//             ],
//             "isBaseIncluded": false
//         },
//         {
//             "teamCategory": "premium",
//             "role": "Photographer",
//             "pricingType": "duration_based",
//             "pricingOptions": [
//                 { "durationText": "0-3 Hours", "durationValue": 3, "price": 4999 },
//                 { "durationText": "5 Hours", "durationValue": 5, "price": 7999 },
//                 { "durationText": "8 Hours", "durationValue": 8, "price": 9999 }
//             ],
//             "features": [
//                 "Professional Photographer",
//                 "Unlimited Quality Photographs",
//                 "All Raw Files & Edited Photographs",
//                 "Digital Cloud Based Delivery (JPEG Format)",
//                 "Instant Delivery (0-1 Days)"
//             ],
//             "isBaseIncluded": true
//         },
//         {
//             "teamCategory": "premium",
//             "role": "Cinematographer",
//             "pricingType": "duration_based",
//             "pricingOptions": [
//                 { "durationText": "0-3 Hours", "durationValue": 3, "price": 5999 },
//                 { "durationText": "5 Hours", "durationValue": 5, "price": 8999 },
//                 { "durationText": "8 Hours", "durationValue": 8, "price": 11999 }
//             ],
//             "features": [
//                 "Professional Cinematographer",
//                 "Unlimited 1080p (HD) Videos and Clips",
//                 "All Raw Data delivered",
//                 "Digital Cloud Based Delivery",
//                 "Instant Delivery (0-1 Days)"
//             ],
//             "isBaseIncluded": false
//         },
//         {
//             "teamCategory": "premium",
//             "role": "Lighting Setup",
//             "pricingType": "fixed",
//             "fixedPrice": 1999,
//             "features": [
//                 "Professional Lighting Team",
//                 "Studio level Setup"
//             ],
//             "isBaseIncluded": false
//         },
//         {
//             "teamCategory": "premium",
//             "role": "Editing",
//             "pricingType": "fixed",
//             "fixedPrice": 1499,
//             "features": [
//                 "Advanced Editing",
//                 "Detailed Color Grading"
//             ],
//             "isBaseIncluded": false
//         }
//     ]
// }
