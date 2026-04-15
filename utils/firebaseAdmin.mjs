import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

let serviceAccount;

// Try to load from a JSON file first (recommended for production)
const serviceAccountPath = path.resolve("firebase-service-account.json");
if (fs.existsSync(serviceAccountPath)) {
    try {
        serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    } catch (err) {
        console.error("Error parsing firebase-service-account.json:", err);
    }
}

// Fallback to environment variables
if (!serviceAccount) {
    serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };
}

if (!admin.apps.length) {
    const hasCredentials = (serviceAccount.project_id && serviceAccount.private_key && serviceAccount.client_email) ||
                          (serviceAccount.projectId && serviceAccount.privateKey && serviceAccount.clientEmail);

    if (hasCredentials) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("Firebase Admin SDK initialized successfully.");
        } catch (error) {
            console.error("Firebase Admin SDK initialization failed:", error);
        }
    } else {
        console.warn("Firebase Admin SDK not initialized: Missing credentials. Please check .env or firebase-service-account.json");
    }
}

export default admin;
