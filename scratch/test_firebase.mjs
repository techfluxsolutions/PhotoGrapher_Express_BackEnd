
import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log("Starting Firebase Credential Test...");
    
    // Test .env first
    let pk = process.env.FIREBASE_PRIVATE_KEY;
    if (pk) {
        pk = pk.trim().replace(/^"|"$/g, '').replace(/\\n/g, '\n');
    }

    const certConfig = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: pk,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    };

    console.log("Project ID:", certConfig.projectId);
    console.log("Client Email:", certConfig.clientEmail);
    console.log("Private Key starts with:", certConfig.privateKey ? certConfig.privateKey.substring(0, 30) : "MISSING");

    try {
        admin.initializeApp({
            credential: admin.credential.cert(certConfig)
        });
        
        // To really test it, we need to try and get an access token
        const token = await admin.app().INTERNAL.getToken();
        console.log("Credential Test: SUCCESS (Got Access Token)");
    } catch (error) {
        console.error("Credential Test: FAILED");
        console.error("Error Message:", error.message);
        if (error.stack) console.error("Stack Trace Snippet:", error.stack.substring(0, 300));
    }
    process.exit();
}

test();
