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
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey) {
        // Trim surrounding quotes if they exist
        privateKey = privateKey.trim();
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.slice(1, -1);
        }
        // Remove trailing commas (sometimes added by mistake in .env)
        if (privateKey.endsWith(',')) {
            privateKey = privateKey.slice(0, -1);
        }
        // Replace literal \n with actual newlines
        privateKey = privateKey.replace(/\\n/g, '\n');
    }

    serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };
}

if (!admin.apps.length) {
    const hasCredentials = (serviceAccount.project_id && serviceAccount.private_key && serviceAccount.client_email) ||
                          (serviceAccount.projectId && serviceAccount.privateKey && serviceAccount.clientEmail);

    if (hasCredentials) {
        try {
            // Use correct keys for credential.cert
            const certData = {
                projectId: serviceAccount.projectId || serviceAccount.project_id,
                privateKey: serviceAccount.privateKey || serviceAccount.private_key,
                clientEmail: serviceAccount.clientEmail || serviceAccount.client_email,
            };

            admin.initializeApp({
                credential: admin.credential.cert(certData),
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
