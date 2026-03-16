import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

import fs from "fs";
dotenv.config();

const logFile = "cors_log.txt";
function log(msg) {
    console.log(msg);
    fs.appendFileSync(logFile, msg + "\n");
}

log("ENV CHECK:");
log("AWS_BUCKET: " + process.env.AWS_BUCKET);
log("AWS_REGION: " + process.env.AWS_REGION);
log("AWS_ENDPOINT: " + process.env.AWS_ENDPOINT);

if (!process.env.AWS_BUCKET) {
    log("CRITICAL: AWS_BUCKET is not defined.");
    process.exit(1);
}

console.log("Starting S3 CORS configuration...");

async function run() {
    try {
        const client = new S3Client({
            region: process.env.AWS_REGION,
            endpoint: process.env.AWS_ENDPOINT,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
        });

        const command = new PutBucketCorsCommand({
            Bucket: process.env.AWS_BUCKET,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ["*"],
                        AllowedMethods: ["PUT", "POST", "GET", "DELETE", "HEAD"],
                        AllowedOrigins: ["*"],
                        ExposeHeaders: ["ETag"],
                        MaxAgeSeconds: 86400
                    }
                ]
            }
        });

        const result = await client.send(command);
        log("Success! CORS is fully enabled.");
    } catch (err) {
        log("Error setting CORS: " + err.message);
    }
}
run();
