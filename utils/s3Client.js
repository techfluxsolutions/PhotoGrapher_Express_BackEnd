import { S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import dotenv from "dotenv";

dotenv.config();

const s3Config = {
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    // Adding optimized timeouts (2-3 minutes as requested)
    requestHandler: new NodeHttpHandler({
        connectionTimeout: 120000, // 2 minutes
        socketTimeout: 180000,     // 3 minutes
    }),
    // The AWS SDK v3 has its own retry logic, but we will also use our custom wrapper
    // for more granular control over business logic retries.
    maxAttempts: 3
};

// Include custom endpoint if specified (e.g., for DigitalOcean Spaces)
if (process.env.AWS_ENDPOINT) {
    s3Config.endpoint = process.env.AWS_ENDPOINT;
}

const s3Client = new S3Client(s3Config);

export default s3Client;
