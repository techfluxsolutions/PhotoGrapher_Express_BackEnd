import {
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
    GetObjectCommand,
    DeleteObjectCommand
} from "@aws-sdk/client-s3";
import s3Client from "../utils/s3Client.js";
import dotenv from "dotenv";

dotenv.config();

const BUCKET_NAME = process.env.AWS_BUCKET;

export const s3Service = {
    /**
     * Start a Multipart Upload session
     * @param {string} fileName Original file name or predefined key
     * @param {string} mimeType File content type
     * @param {string} [providedKey] Optional predefined key to use directly
     * @returns {Object} { uploadId, key }
     */
    startMultipartUpload: async (fileName, mimeType, providedKey) => {
        let key;
        if (providedKey) {
            // Use the provided key directly
            key = providedKey;
        } else {
            // Sanitize file name and create unique key (backward compatibility)
            const safeFileName = fileName.replace(/\s+/g, "-");
            key = `uploads/${Date.now()}-${safeFileName}`;
        }

        const command = new CreateMultipartUploadCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: mimeType,
            // ACL: "public-read", // Uncomment if making public immediately
        });

        const response = await s3Client.send(command);
        return {
            uploadId: response.UploadId,
            key: response.Key
        };
    },

    /**
     * Upload a single chunk to the current Multipart session
     * @param {string} key File path/key in S3
     * @param {string} uploadId The session ID
     * @param {number} partNumber The chronological chunk number (1-index)
     * @param {Buffer} buffer The chunk's binary data
     * @returns {Object} ETag (entity tag) for the uploaded part
     */
    uploadChunk: async (key, uploadId, partNumber, buffer) => {
        const command = new UploadPartCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
            Body: buffer,
        });

        const response = await s3Client.send(command);
        return {
            ETag: response.ETag,
            PartNumber: partNumber
        };
    },

    /**
     * Complete the Multipart Upload
     * @param {string} key File path/key in S3
     * @param {string} uploadId The session ID
     * @param {Array} parts Array of objects: { ETag, PartNumber }
     * @returns {string} The final public URL (if applicable) or S3 object representation
     */
    completeMultipartUpload: async (key, uploadId, parts) => {
        // AWS strictly requires Parts to be sorted by PartNumber ascending
        const sortedParts = parts.sort((a, b) => a.PartNumber - b.PartNumber);

        const command = new CompleteMultipartUploadCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            UploadId: uploadId,
            MultipartUpload: {
                Parts: sortedParts
            }
        });

        await s3Client.send(command);
        const baseUrl = process.env.SPACES_CDN_URL || process.env.AWS_PUBLIC_URL || "";
        return `${baseUrl}/${key}`;
    },

    /**
     * Abort the Multipart Upload and prune abandoned parts from the bucket
     * @param {string} key File path/key in S3
     * @param {string} uploadId The session ID
     */
    abortMultipartUpload: async (key, uploadId) => {
        const command = new AbortMultipartUploadCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            UploadId: uploadId,
        });

        return await s3Client.send(command);
    },

    /**
     * Delete an existing file
     * @param {string} key File path/key in S3
     */
    deleteFile: async (key) => {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        return await s3Client.send(command);
    },

    /**
     * Get a readable stream for a file (useful for large media inline viewing)
     * @param {string} key File path/key in S3
     * @param {string} range HTTP Range header for streaming chunks (optional)
     */
    getFileStream: async (key, range = null) => {
        const params = {
            Bucket: BUCKET_NAME,
            Key: key,
        };

        if (range) {
            params.Range = range;
        }

        const command = new GetObjectCommand(params);
        return await s3Client.send(command);
    },

    //getfilestream multiple 
    getFileStreamMultiple: async (keys = []) => {
        if (!Array.isArray(keys) || keys.length === 0) {
            throw new Error("Keys array is required");
        }

        const objects = keys.map((key) => ({
            Key: key
        }));

        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Delete: {
                Objects: objects,
                Quiet: false
            }
        });

        const response = await s3Client.send(command);

        return {
            deleted: response.Deleted || [],
            errors: response.Errors || []
        };
    },
    // delete multiple files 


    deleteMultipleFiles: async (keys = []) => {
        if (!Array.isArray(keys) || keys.length === 0) {
            throw new Error("Keys array is required");
        }

        const objects = keys.map((key) => ({
            Key: key
        }));

        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Delete: {
                Objects: objects,
                Quiet: false
            }
        });

        const response = await s3Client.send(command);

        return {
            deleted: response.Deleted || [],
            errors: response.Errors || []
        };
    },

};
