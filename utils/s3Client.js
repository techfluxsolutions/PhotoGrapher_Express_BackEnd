import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const s3Config = {
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
};

// Include custom endpoint if specified (e.g., for DigitalOcean Spaces)
if (process.env.AWS_ENDPOINT) {
    s3Config.endpoint = process.env.AWS_ENDPOINT;
}

const s3Client = new S3Client(s3Config);

export default s3Client;
