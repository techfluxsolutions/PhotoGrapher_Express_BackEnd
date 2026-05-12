import mongoose from 'mongoose';
import 'dotenv/config';

// Collections to preserve (Static setup)
const STATIC_COLLECTIONS = [
    'admins', 'roles', 'sidebaricons', 'services', 'photographyplans',
    'editingplans', 'cloudplans', 'additionalservices', 'packages',
    'otherpackages', 'platformsettings', 'faqs', 'testimonials',
    'teamshootplans', 'hourlyshootservices'
];

async function clearDatabase() {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGODB_URI not found in .env");

        await mongoose.connect(uri);
        console.log("✅ Connected to MongoDB");

        const collections = await mongoose.connection.db.listCollections().toArray();
        
        for (const col of collections) {
            if (STATIC_COLLECTIONS.includes(col.name)) {
                console.log(`📌 Skipping static: ${col.name}`);
                continue;
            }

            console.log(`🗑️ Clearing data: ${col.name}`);
            await mongoose.connection.db.collection(col.name).deleteMany({});
        }

        console.log("\n✨ Data cleanup complete!");
        process.exit(0);
    } catch (error) {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    }
}

clearDatabase();

