import mongoose from 'mongoose';
import 'dotenv/config';

async function fixIndex() {
    console.log("Starting index fix script...");
    const uri = process.env.MONGODB_URI;
    console.log("URI found:", uri ? "Yes" : "No");

    if (!uri) {
        console.error("MONGODB_URI not found in .env. Current CWD:", process.cwd());
        process.exit(1);
    }

    try {
        console.log("Attempting to connect to MongoDB...");
        await mongoose.connect(uri);
        console.log("Connected to MongoDB successfully.");

        const collection = mongoose.connection.db.collection('admins');

        console.log("Fetching indexes...");
        const indexes = await collection.indexes();
        console.log("Current indexes:", indexes.map(idx => idx.name).join(", "));

        const hasMobileIndex = indexes.some(idx => idx.name === 'mobileNumber_1');

        if (hasMobileIndex) {
            console.log("Dropping unique index mobileNumber_1...");
            await collection.dropIndex('mobileNumber_1');
            console.log("Index dropped successfully.");
        } else {
            console.log("Index mobileNumber_1 not found. It might have been already dropped or has a different name.");
        }

    } catch (error) {
        console.error("Error fixing index:", error.message);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
        process.exit();
    }
}

fixIndex();
