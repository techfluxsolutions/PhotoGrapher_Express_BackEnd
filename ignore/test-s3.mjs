import { S3Client, CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

async function test() {
    try {
        console.log("Testing multipart upload start...");
        const command = new CreateMultipartUploadCommand({
            Bucket: process.env.AWS_BUCKET,
            Key: `uploads/${Date.now()}-test.txt`,
            ContentType: 'text/plain',
        });
        const data = await s3.send(command);
        console.log("Success:", data);
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
