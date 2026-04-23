import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, "\n");
}

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: privateKey,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("Firebase Admin initialized using .env");
  } catch (error) {
    console.error("Firebase Admin init error:", error);
  }
}

export default admin;