import createUploader from "../Config/uploadCreate.js";
import path from "path";
import fs from "fs";

// Mock Express req and res
const req = {
    file: {
        fieldname: "avatar",
        originalname: "test.png",
        encoding: "7bit",
        mimetype: "image/png",
    },
};

const res = {};

// Helper to manually run the multer storage engine destination logic
async function verifyPath() {
    console.log("Starting verification...");

    // We want to verify that the folder created/used is uploads/userProfile
    const uploader = createUploader({
        folder: "uploads/userProfile",
        maxSizeMB: 2,
        allowedTypes: /jpeg|jpg|png/,
    });

    // Multer instance doesn't expose the storage configuration easily in a way we can just inspect 
    // without using private properties, but we can check if the directory exists after initialization 
    // because createUploader creates it on init.

    const targetDir = path.resolve("uploads/userProfile");
    const oldDir = path.resolve("uploads/userprofile");

    // Check if the directory exists
    if (fs.existsSync(targetDir)) {
        console.log(`✅ Directory exists: ${targetDir}`);

        // Check case sensitivity if filesystem supports it (macOS usually is case-insensitive but preserving)
        // We can inspect the actual casing by reading the parent directory
        const parentDir = path.dirname(targetDir);
        const entries = fs.readdirSync(parentDir);
        const match = entries.find(e => e === "userProfile");

        if (match) {
            console.log(`✅ Directory casing matches: ${match}`);
        } else {
            console.log(`⚠️ Directory casing might be incorrect or lowercase on disk: ${entries.find(e => e.toLowerCase() === "userprofile")}`);
        }

    } else {
        console.error(`❌ Directory was not created: ${targetDir}`);
    }
}

verifyPath();
