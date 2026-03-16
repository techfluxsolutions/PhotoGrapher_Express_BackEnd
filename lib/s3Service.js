import {
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    PutObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import s3Client from "../utils/s3Client.js";
import { withRetry, CircuitBreaker } from "../utils/retryUtils.js";
import dotenv from "dotenv";

dotenv.config();

const BUCKET_NAME = process.env.AWS_BUCKET;

// Initialize a circuit breaker for S3 operations
const s3CircuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000 // 30 seconds
});

export const s3Service = {
    /**
     * Generate a presigned URL for a single file PUT upload
     */
    getPresignedUrl: async (key, mimeType, expiresIn = 3600) => {
        return await withRetry(async () => {
            const command = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                ContentType: mimeType,
            });
            const url = await getSignedUrl(s3Client, command, { expiresIn });
            return url;
        }, { circuitBreaker: s3CircuitBreaker });
    },

    /**
     * Start a Multipart Upload session and generate presigned URLs for each part
     */
    startMultipartUpload: async (fileName, mimeType, providedKey) => {
        return await withRetry(async () => {
            let key = providedKey || `uploads/${Date.now()}-${fileName.replace(/\s+/g, "-")}`;

            const command = new CreateMultipartUploadCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                ContentType: mimeType,
            });

            const response = await s3Client.send(command);
            return {
                uploadId: response.UploadId,
                key: response.Key
            };
        }, { circuitBreaker: s3CircuitBreaker });
    },

    /**
     * Generate a presigned URL for a specific part of a multipart upload
     */
    getPresignedUrlForPart: async (key, uploadId, partNumber, expiresIn = 3600) => {
        return await withRetry(async () => {
            const command = new UploadPartCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                UploadId: uploadId,
                PartNumber: partNumber,
            });
            return await getSignedUrl(s3Client, command, { expiresIn });
        }, { circuitBreaker: s3CircuitBreaker });
    },

    /**
     * Upload a single chunk (Legacy/Fallback - server handles data)
     */
    uploadChunk: async (key, uploadId, partNumber, buffer) => {
        return await withRetry(async () => {
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
        }, { circuitBreaker: s3CircuitBreaker });
    },

    /**
     * Complete the Multipart Upload
     */
    completeMultipartUpload: async (key, uploadId, parts) => {
        return await withRetry(async () => {
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
        }, { circuitBreaker: s3CircuitBreaker });
    },

    /**
     * Abort the Multipart Upload
     */
    abortMultipartUpload: async (key, uploadId) => {
        return await withRetry(async () => {
            const command = new AbortMultipartUploadCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                UploadId: uploadId,
            });

            return await s3Client.send(command);
        }, { circuitBreaker: s3CircuitBreaker });
    },

    /**
     * Delete an existing file
     */
    deleteFile: async (key) => {
        return await withRetry(async () => {
            const command = new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            });

            return await s3Client.send(command);
        }, { circuitBreaker: s3CircuitBreaker });
    },

    /**
     * Get a readable stream for a file
     */
    getFileStream: async (key, range = null) => {
        return await withRetry(async () => {
            const params = {
                Bucket: BUCKET_NAME,
                Key: key,
            };

            if (range) {
                params.Range = range;
            }

            const command = new GetObjectCommand(params);
            return await s3Client.send(command);
        }, { circuitBreaker: s3CircuitBreaker });
    },

    /**
     * Delete multiple files
     */
    // deleteMultipleFiles: async (keys = []) => {
    //     if (!Array.isArray(keys) || keys.length === 0) {
    //         throw new Error("Keys array is required");
    //     }

    //     return await withRetry(async () => {
    //         const objects = keys.map((key) => ({
    //             Key: key
    //         }));

    //         const command = new DeleteObjectsCommand({
    //             Bucket: BUCKET_NAME,
    //             Delete: {
    //                 Objects: objects,
    //                 Quiet: false
    //             }
    //         });

    //         const response = await s3Client.send(command);

    //         return {
    //             deleted: response.Deleted || [],
    //             errors: response.Errors || []
    //         };
    //     }, { circuitBreaker: s3CircuitBreaker });
    // },

    deleteMultipleFiles: async (keys = []) => {
        if (!Array.isArray(keys) || keys.length === 0) {
            return { deleted: [], errors: [] }; // ← idempotent, no throw
            // or throw if you really want strict behavior
        }

        // Remove duplicates + invalid values
        const uniqueKeys = [...new Set(keys.filter(k => typeof k === 'string' && k.trim()))];

        if (uniqueKeys.length === 0) {
            return { deleted: [], errors: [] };
        }

        return await withRetry(async () => {
            const objects = uniqueKeys.map(Key => ({ Key }));

            const command = new DeleteObjectsCommand({
                Bucket: BUCKET_NAME,
                Delete: {
                    Objects: objects,
                    // Quiet: true    ← usually better in production (less response size)
                    // but keep false if you really need to know failures
                }
            });

            const { Deleted = [], Errors = [] } = await s3Client.send(command);

            return {
                deleted: Deleted,
                errors: Errors
            };
        }, { circuitBreaker: s3CircuitBreaker });
    },
};
