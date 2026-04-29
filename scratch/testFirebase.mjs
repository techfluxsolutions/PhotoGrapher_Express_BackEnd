import admin from "firebase-admin";
import dotenv from "dotenv";
import path from "path";

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

console.log("Project ID:", serviceAccount.projectId);
console.log("Client Email:", serviceAccount.clientEmail);
console.log("Private Key exists:", !!serviceAccount.privateKey);
if (serviceAccount.privateKey) {
    console.log("Private Key Start:", serviceAccount.privateKey.substring(0, 30));
    console.log("Private Key End:", serviceAccount.privateKey.substring(serviceAccount.privateKey.length - 30));
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase Admin initialized successfully");
  
  // Try a simple operation that requires auth but doesn't send a real message
  // Just getting the messaging object doesn't check auth usually until a call is made
  // But we can try to send a dry run message if we had a token
  console.log("Trying dry run...");
  // Use a dummy token for dry run
  const message = {
    notification: { title: "Test", body: "Test" },
    token: "dummy-token-for-dry-run",
  };
  // We expect this to fail with "invalid registration token" but it should BE AUTHENTICATED
  await admin.messaging().send(message, true); 
} catch (error) {
  console.error("❌ Firebase Admin test error:", error);
}
