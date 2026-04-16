import mongoose from "mongoose";
import "dotenv/config";
import EditingPlan from "../models/EditingPlan.mjs";

const quantities = [
    { id: '3-videos', title: '3 Videos', subtitle: 'Up to 1 minute each', startingPrice: 3999, numVideos: 3 },
    { id: '5-videos', title: '5 Videos', subtitle: 'Up to 1 minute each', startingPrice: 5999, numVideos: 5 },
    { id: '8-videos', title: '8 Videos', subtitle: 'Up to 1 minute each', startingPrice: 8999, numVideos: 8 },
    { id: '10-videos', title: '10 Videos', subtitle: 'Up to 1 minute each', startingPrice: 10999, numVideos: 10 },
];

const packages = [
    {
        id: 'standard',
        title: 'STANDARD',
        prices: {
            '3-videos': 3999,
            '5-videos': 5999,
            '8-videos': 8999,
            '10-videos': 10999,
        },
        features: [
            'Professional trimming and clean cuts',
            'Background music integration',
            'Basic color correction',
            'Text overlay (titles, caption, names)',
            'Smooth transitions between clips',
            'Aspect ratio optimization (9:16, 1:1, 16:9 as required)',
            'Final export in HD (1080p)',
            '2 minor revision rounds',
        ],
        isPremium: false
    },
    {
        id: 'premium',
        title: 'PREMIUM',
        prices: {
            '3-videos': 5999,
            '5-videos': 8999,
            '8-videos': 12999,
            '10-videos': 14999,
        },
        features: [
            'Advanced cinematic cuts & storytelling flow',
            'Professional color grading',
            'Motion graphics & animated text',
            'Advanced sound design',
            'Concept-based edit structure (hook → build → climax → CTA)',
            '4K export (If footage supports it)',
            '3-4 revision rounds',
            'Priority delivery',
        ],
        isPremium: true
    }
];

const seedEditingPlans = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            console.error("MONGODB_URI not found in .env");
            process.exit(1);
        }

        console.log("Connecting to MongoDB...");
        await mongoose.connect(mongoUri);
        console.log("Connected successfully.");

        console.log("Cleaning up existing editing plans...");
        await EditingPlan.deleteMany({});

        const plansToInsert = [];

        packages.forEach(pkg => {
            quantities.forEach(qty => {
                plansToInsert.push({
                    numberOfVideos: qty.numVideos,
                    planName: qty.title,
                    subtitle: qty.subtitle,
                    startingPrice: qty.startingPrice,
                    price: pkg.prices[qty.id],
                    features: pkg.features,
                    planCategory: pkg.title,
                    isPremium: pkg.isPremium
                });
            });
        });

        console.log(`Inserting ${plansToInsert.length} editing plans...`);
        const result = await EditingPlan.insertMany(plansToInsert);
        console.log(`Seeded ${result.length} plans successfully.`);

        process.exit(0);
    } catch (error) {
        console.error("Error seeding editing plans:", error);
        process.exit(1);
    }
};

seedEditingPlans();
