import { s3Service } from "../lib/s3Service.js";
import DataLinks from "../models/DataLinks.js";
import archiver from "archiver";
import mongoose from "mongoose";
export const uploadController = {
    // 1. Init multipart upload
    /**
     * Start Upload - Intelligent Strategy Selection
     * Files < 100MB: Presigned Single PUT URL
     * Files >= 100MB: Multipart Upload with Presigned Part URLs
     */
    startUpload: async (req, res) => {
        const startTime = Date.now();
        try {
            const { fileName, fileType, relativePath, veroaBookingId, fileSize } = req.body;

            if (!fileName || !fileType) {
                return res.status(400).json({ error: "fileName and fileType are required." });
            }

            let key;
            if (relativePath) {
                key = `uploads/${veroaBookingId}/${relativePath}`;
            } else {
                key = `uploads/${veroaBookingId}/${Date.now()}-${fileName.replace(/\s+/g, "-")}`;
            }

            const STRATEGY_THRESHOLD = 100 * 1024 * 1024; // 100MB
            const CHUNK_SIZE = 20 * 1024 * 1024; // 20MB parts

            if (fileSize && fileSize < STRATEGY_THRESHOLD) {
                // Strategy: Single PUT (faster for small files)
                console.log(`[Upload] Single PUT strategy selected for ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
                const uploadUrl = await s3Service.getPresignedUrl(key, fileType);

                const duration = Date.now() - startTime;
                console.log(`[Metrics] startUpload (Single) took ${duration}ms`);

                return res.status(200).json({
                    strategy: "single",
                    uploadUrl,
                    uploadId: null, // For API consistency
                    key,
                    metrics: { duration }
                });
            } else {
                // Strategy: Multipart Upload (better for large files, supports resume)
                console.log(`[Upload] Multipart strategy selected for ${fileName} (${fileSize ? (fileSize / 1024 / 1024).toFixed(2) : "Unknown"} MB)`);
                const { uploadId, key: s3Key } = await s3Service.startMultipartUpload(fileName, fileType, key);

                // For multipart, we'll return the uploadId and key. 
                // The frontend will request presigned URLs for each part.
                const duration = Date.now() - startTime;
                console.log(`[Metrics] startUpload (Multipart Init) took ${duration}ms`);

                return res.status(200).json({
                    strategy: "multipart",
                    uploadId,
                    key: s3Key,
                    chunkSize: CHUNK_SIZE,
                    metrics: { duration }
                });
            }

        } catch (error) {
            console.error("Start upload error:", error);
            res.status(500).json({ error: error.message });
        }
    },

    /**
     * Get Presigned URL for a specific part (Frontend calls this for each part)
     */
    getPartUploadUrl: async (req, res) => {
        try {
            if (!req.body) {
                return res.status(400).json({
                    error: "Request body is missing. Ensure Content-Type is application/json."
                });
            }

            const { key, uploadId, partNumber } = req.body;
            if (!key || !uploadId || !partNumber) {
                return res.status(400).json({
                    error: "key, uploadId, and partNumber are required in the request body.",
                    received: { key: !!key, uploadId: !!uploadId, partNumber: !!partNumber }
                });
            }

            const uploadUrl = await s3Service.getPresignedUrlForPart(key, uploadId, parseInt(partNumber, 10));
            res.status(200).json({ uploadUrl });
        } catch (error) {
            console.error("Get part URL error:", error);
            res.status(500).json({ error: error.message });
        }
    },
    // 2. Upload a 20MB chunk 
    // Mutler saves the chunk in Memory temporarily via req.file.buffer
    uploadChunk: async (req, res) => {
        try {
            const { key, uploadId, partNumber } = req.body;


            const fileBuffer = req.file?.buffer;

            if (!key || !uploadId || !partNumber || !fileBuffer) {
                return res.status(400).json({
                    error: "Missing required fields",
                    received: {
                        key: !!key,
                        uploadId: !!uploadId,
                        partNumber: !!partNumber,
                        fileBuffer: !!fileBuffer,
                        contentType: req.headers['content-type']
                    }
                });
            }

            const partInfo = await s3Service.uploadChunk(
                key,
                uploadId,
                parseInt(partNumber, 10),
                fileBuffer
            );

            res.status(200).json(partInfo);
        } catch (error) {
            console.error("Upload chunk error:", error);
            res.status(500).json({ error: error });
        }
    },

    // completeUpload: async (req, res) => {
    //     try {
    //         const { key, uploadId, parts, bookingid, clientId, photographerId, veroaBookingId } = req.body;

    //         if (!key || !uploadId || !parts || !Array.isArray(parts)) {
    //             return res.status(400).json({ error: "key, uploadId, and parts array are required." });
    //         }

    //         const fileUrl = await s3Service.completeMultipartUpload(key, uploadId, parts);
    //         const savedDatalink = await DataLinks.create({
    //             dataLink: fileUrl,
    //             key: key,
    //             bookingid: bookingid,
    //             clientId: clientId,
    //             photographerId: photographerId,
    //             veroaBookingId
    //         })
    //         res.status(200).json({ message: "Upload complete successfully", fileUrl, key, savedDatalink });
    //     } catch (error) {
    //         console.error("Complete upload error:", error);
    //         res.status(500).json({ error: error.message });
    //     }
    // },

    // detect the folder structure 

    completeUpload: async (req, res) => {
        try {

            const {
                key,
                uploadId,
                parts,
                bookingid,
                clientId,
                photographerId,
                veroaBookingId
            } = req.body;

            if (!key || !parts || !Array.isArray(parts)) {
                return res.status(400).json({
                    error: "key and parts array are required."
                });
            }

            let fileUrl;
            if (uploadId) {
                // Multipart Completion
                fileUrl = await s3Service.completeMultipartUpload(key, uploadId, parts);
            } else {
                // Single Upload Completion (Construct URL directly)
                const baseUrl = process.env.SPACES_CDN_URL || process.env.AWS_PUBLIC_URL || "";
                fileUrl = `${baseUrl}/${key}`;
            }

            // Extract folder path
            const folderPath = key.substring(0, key.lastIndexOf("/"));

            const savedDatalink = await DataLinks.create({
                dataLink: fileUrl,
                key: key,
                folderPath,
                bookingid,
                clientId,
                photographerId,
                veroaBookingId
            });

            res.status(200).json({
                message: "Upload complete successfully",
                fileUrl,
                key
            });

        } catch (error) {
            console.error("Complete upload error:", error);
            res.status(500).json({ error: error.message });
        }
    },

    // 4. Abort/Cancel
    abortUpload: async (req, res) => {
        try {
            const { key, uploadId } = req.body;

            if (!key || !uploadId) {
                return res.status(400).json({ error: "key and uploadId are required." });
            }

            await s3Service.abortMultipartUpload(key, uploadId);
            res.status(200).json({ message: "Upload aborted and cleaned up." });
        } catch (error) {
            console.error("Abort upload error:", error);
            res.status(500).json({ error: error.message });
        }
    },

    // 5. Native streaming
    streamFile: async (req, res) => {
        let key = null;
        try {
            // e.g. /upload/uploads/123-video.mp4
            key = req.params.key || req.params[0];
            const range = req.headers.range;

            // Handle key: it might be a string or an array depending on wildcard capture
            if (Array.isArray(key)) {
                key = key.join('/');
            }

            // Sanitize key: ensure it is a string and remove leading slashes or asterisk
            key = String(key || "").replace(/^[\/\*]+/, "");

            const data = await s3Service.getFileStream(key, range);

            // Set inline disposition (view in browser, do not force download)
            res.setHeader("Content-Disposition", `inline; filename="${key.split('/').pop()}"`);

            if (data.ContentType) res.setHeader("Content-Type", data.ContentType);
            if (data.ContentLength) res.setHeader("Content-Length", data.ContentLength);
            if (data.ContentRange) res.setHeader("Content-Range", data.ContentRange);
            if (data.AcceptRanges) res.setHeader("Accept-Ranges", data.AcceptRanges);

            const statusCode = range ? 206 : 200;
            res.status(statusCode);

            // Pipe S3 readable stream to the Express response
            data.Body.pipe(res);

        } catch (error) {
            if (error.name === "NoSuchKey") {
                return res.status(404).json({
                    error: "File not found in S3.",
                    triedKey: key
                });
            }
            console.error("Stream error:", error);
            res.status(500).json({ error: error.message });
        }
    },

    // 6. Protected streaming for Users/Photographers
    // streamProtectedFile: async (req, res) => {
    //     let key = null;
    //     try {
    //         key = req.params.key || req.params[0];
    //         const range = req.headers.range;
    //         const userId = req.user.id;
    //         const requestedBookingId = req.params.bookingId;



    //         if (!key) {
    //             return res.status(400).json({ error: "File key is required." });
    //         }

    //         // Handle key: it might be a string or an array depending on wildcard capture
    //         if (Array.isArray(key)) {
    //             key = key.join('/');
    //         }

    //         // Sanitize key: ensure it is a string and remove leading slashes or asterisk 
    //         key = String(key || "").replace(/^[\/\*]+/, "");

    //         // Verify access in DataLinks database
    //         const query = {
    //             bookingid: new mongoose.Types.ObjectId(requestedBookingId)
    //         };

    //         const linkRecord = await DataLinks.findOne(query);

    //         if (!linkRecord) {
    //             return res.status(403).json({
    //                 error: "Unauthorized access. You do not have permission to view this file or the booking ID mismatch."
    //             });
    //         }
    //         // if (linkRecord) {
    //         //     return res.status(200).json({
    //         //         message: "File found in DataLinks database.",
    //         //         linkRecord,
    //         //         key
    //         //     })
    //         // }
    //         const data = await s3Service.getFileStream(
    //             key,
    //             range);

    //         // Set inline disposition
    //         res.setHeader("Content-Disposition", `inline; filename="${key.split('/').pop()}"`);

    //         if (data.ContentType) res.setHeader("Content-Type", data.ContentType);
    //         if (data.ContentLength) res.setHeader("Content-Length", data.ContentLength);
    //         if (data.ContentRange) res.setHeader("Content-Range", data.ContentRange);
    //         if (data.AcceptRanges) res.setHeader("Accept-Ranges", data.AcceptRanges);

    //         const statusCode = range ? 206 : 200;
    //         res.status(statusCode);

    //         data.Body.pipe(res);

    //     } catch (error) {


    //         if (error.name === "NoSuchKey") {
    //             return res.status(404).json({
    //                 error: "File not found in S3.",
    //                 triedKey: key
    //             });
    //         }
    //         res.status(500).json({
    //             error: error.message,
    //             details: error.name
    //         });
    //     }
    // },

    // optimize stream protected 

    // Optimized Logic
    streamProtectedFile: async (req, res) => {
        try {
            const key = (req.params.key || req.params[0]).replace(/^[\/\*]+/, "");
            const requestedBookingId = req.params.bookingId;

            // 1. Quick DB Validation
            const linkRecord = await DataLinks.findOne({
                bookingid: new mongoose.Types.ObjectId(requestedBookingId)
            });

            if (!linkRecord) return res.status(403).json({ error: "Unauthorized" });

            // 2. Instead of streaming, generate a Signed URL (valid for 1 hour)
            const signedUrl = await s3Service.getSignedUrl(key, 3600);

            // 3. Redirect the user or return the URL
            return res.json({ url: signedUrl });

        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },
    downloadSingleFile: async (req, res) => {
        try {
            const { key, bookingId } = req.body;
            if (!key) {
                return res.status(400).json({ error: "Missing required fields." });
            }
            const isFileExist = await DataLinks.findOne({ bookingid: bookingId, key: key });
            if (!isFileExist) {
                return res.status(404).json({ error: "File not found in S3." });
            }
            const data = await s3Service.getFileStream(key);
            if (!data) {
                return res.status(404).json({ error: "File not found in S3." });
            }
            res.setHeader("Content-Type", data.ContentType);
            res.setHeader("Content-Length", data.ContentLength);
            res.setHeader("Content-Disposition", `attachment; filename="${key.split('/').pop()}"`);
            data.Body.pipe(res);
        } catch (error) {
            console.error("Download file error:", error);
            res.status(500).json({ error: error.message });
        }
    },

    // downloadMultipleFiles no zip direct download 


    downloadMultipleFiles: async (req, res) => {
        try {
            const { keys, bookingid } = req.body;
            if (!keys || keys.length === 0 || !bookingid) {
                return res.status(400).json({ error: "Missing required fields" })
            }

            const data = await s3Service.getFileStreamMultiple(keys);
            if (!data) {
                return res.status(404).json({ error: "File not found in S3." });
            }
            res.setHeader("Content-Type", data.ContentType);
            res.setHeader("Content-Length", data.ContentLength);
            res.setHeader("Content-Disposition", `attachment; filename="${key.split('/').pop()}"`);
            data.Body.pipe(res);
        } catch (error) {
            console.error("Download file error:", error);
            res.status(500).json({ error: error.message });
        }
    },


    downloadZip: async (req, res) => {
        try {
            const { bookingid, clientId, photographerId } = req.body;
            console.log("bi", bookingid)

            if (!bookingid || !clientId || !photographerId) {
                return res.status(400).json({ error: "Missing required fields." });
            }
            // Fetch all files for this booking

            const files = await DataLinks.find({
                bookingid: bookingid,
                clientId: clientId,
                photographerId: photographerId
            }).select('key');

            if (!files.length) {
                return res.status(404).json({ error: "No files found for this booking." });
            }
            const keys = files.map(file => file.key).filter(Boolean);
            console.log("keys", keys)
            // ZIP headers
            res.setHeader("Content-Type", "application/zip");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="booking-${bookingid}-files.zip"`
            );

            const archive = archiver("zip", { zlib: { level: 9 } });

            archive.pipe(res);

            archive.on("error", (err) => {
                throw err;
            });

            // Fetch files from S3 / Spaces
            for (const key of keys) {
                const s3Data = await s3Service.getFileStream(key);
                const fileName = key.split("/").pop();

                archive.append(s3Data.Body, {
                    name: fileName
                });
            }

            await archive.finalize();

        } catch (error) {
            console.error("Zip download error:", error);

            if (!res.headersSent) {
                res.status(500).json({ error: error.message });
            }
        }
    },

    downloadZiponFourtyPlus: async (req, res) => {
        try {
            const { bookingid, keys } = req.body;
            if (!bookingid || !keys || keys.length === 0) {
                return res.status(400).json({ error: "Missing required fields." });
            }
            // Fetch all files for this booking

            const files = await DataLinks.find({
                bookingid: bookingid,
                key: { $in: keys },
            }).select('key');

            if (!files.length) {
                return res.status(404).json({ error: "No files found for this booking." });
            }
            // ZIP headers
            res.setHeader("Content-Type", "application/zip");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="booking-${bookingid}-files.zip"`
            );

            const archive = archiver("zip", { zlib: { level: 9 } });

            archive.pipe(res);

            archive.on("error", (err) => {
                throw err;
            });

            // Fetch files from S3 / Spaces
            for (const key of keys) {
                const s3Data = await s3Service.getFileStream(key);
                const fileName = key.split("/").pop();

                archive.append(s3Data.Body, {
                    name: fileName
                });
            }

            await archive.finalize();

        } catch (error) {
            console.error("Zip download error:", error);

            if (!res.headersSent) {
                res.status(500).json({ error: error.message });
            }
        }
    },

    // delete any single file from the s3 bucket files
    deleteSingleS3File: async (req, res) => {
        try {
            const { key, bookingId } = req.body;

            if (!key || !bookingId) {
                return res.status(400).json({ error: "Missing required fields." });
            }
            const s3Data = await s3Service.deleteFile(key);
            if (s3Data) {
                await DataLinks.deleteOne({ bookingid: bookingId, key: key });
            }
            res.status(200).json({ message: "File deleted successfully." });
        } catch (error) {
            console.error("Delete file error:", error);
            res.status(500).json({ error: error.message });
        }
    },
    deleteMultipleS3Files: async (req, res) => {
        try {
            const { key, bookingId } = req.body;

            // ────────────────────────────────────────────────
            // Validation
            // ────────────────────────────────────────────────
            if (!bookingId?.trim()) {
                return res.status(400).json({
                    error: "bookingId is required"
                });
            }

            if (!key || (Array.isArray(key) && key.length === 0)) {
                return res.status(400).json({
                    error: "At least one key is required"
                });
            }

            // Normalize to array
            const keys = Array.isArray(key) ? key : [key];

            // Remove invalid / empty entries early
            const validKeys = keys
                .filter(k => typeof k === 'string' && k.trim())
                .map(k => k.trim());

            if (validKeys.length === 0) {
                return res.status(400).json({
                    error: "No valid S3 keys provided"
                });
            }

            // Optional: you could also verify these keys exist in DB first
            // (adds one query but prevents unnecessary S3 calls for phantom keys)

            // ────────────────────────────────────────────────
            // Delete from S3
            // ────────────────────────────────────────────────
            const s3Result = await s3Service.deleteMultipleFiles(validKeys);

            const successfullyDeleted = s3Result.deleted?.length ?? 0;
            const failedCount = s3Result.errors?.length ?? 0;

            // ────────────────────────────────────────────────
            // Only clean up DB for keys that were actually deleted
            // ────────────────────────────────────────────────
            let dbDeletedCount = 0;

            if (successfullyDeleted > 0) {
                const deletedKeys = s3Result.deleted.map(d => d.Key);

                const { deletedCount } = await DataLinks.deleteMany({
                    bookingid: bookingId,
                    key: { $in: deletedKeys }
                });

                dbDeletedCount = deletedCount;
            }

            // ────────────────────────────────────────────────
            // Response logic
            // ────────────────────────────────────────────────
            if (failedCount === 0) {
                return res.status(200).json({
                    message: "Files deleted successfully",
                    deletedCount: successfullyDeleted,
                    dbRemoved: dbDeletedCount
                });
            }

            // Partial or complete failure → still 200 + detailed info
            // (use 207 Multi-Status if your API clients support it)
            return res.status(200).json({
                message: failedCount === validKeys.length
                    ? "No files could be deleted"
                    : "Some files could not be deleted",
                deletedCount: successfullyDeleted,
                failedCount,
                dbRemoved: dbDeletedCount,
                failedDetails: s3Result.errors?.map(e => ({
                    key: e.Key,
                    code: e.Code,
                    message: e.Message
                })) ?? []
            });

        } catch (err) {
            console.error("deleteMultipleS3Files failed:", {
                bookingId: req.body.bookingId,
                keys: req.body.key,
                error: err.message,
                stack: err.stack?.slice(0, 300)
            });

            return res.status(500).json({
                error: "Failed to delete files",
                message: err.message
            });
        }
    },

    // deleteMultipleS3Files: async (req, res) => {
    //     try {
    //         const { key, bookingId } = req.body;

    //         if (!key || !bookingId) {
    //             return res.status(400).json({ error: "Missing required fields." });
    //         }
    //         const s3Data = await s3Service.deleteMultipleFiles(key);
    //         if (s3Data) {
    //             await DataLinks.deleteMany({ bookingid: bookingId, key: { $in: key } });
    //         }
    //         res.status(200).json({ message: "Files deleted successfully." });
    //     } catch (error) {
    //         console.error("Delete file error:", error);
    //         res.status(500).json({ error: error.message });
    //     }
    // },
    // deleteAllS3Files: async (req, res) => {
    //     try {
    //         const { bookingId } = req.params;
    //         const keys = await DataLinks.find({ bookingid: bookingId }).select('key');
    //         if (!bookingId) {
    //             return res.status(400).json({ error: "Missing required fields." });
    //         }
    //         const s3Data = await s3Service.deleteMultipleFiles(keys.map(key => key.key));
    //         if (s3Data) {
    //             await DataLinks.deleteMany({ bookingid: bookingId });
    //         }
    //         res.status(200).json({ message: "Files deleted successfully." });
    //     } catch (error) {
    //         console.error("Delete file error:", error);
    //         res.status(500).json({ error: error.message });
    //     }
    // },


    deleteAllS3Files: async (req, res) => {
        try {
            const { bookingId } = req.params;

            if (!bookingId?.trim()) {
                return res.status(400).json({
                    error: "bookingId is required"
                });
            }

            // ────────────────────────────────────────────────
            //  Option A: get only the keys we actually need
            // ────────────────────────────────────────────────
            const records = await DataLinks
                .find({ bookingid: bookingId })
                .select('key')
                .lean(); // ← small perf gain + cleaner

            if (records.length === 0) {
                return res.status(200).json({
                    message: "No files found for this booking",
                    deletedCount: 0
                });
            }

            const keys = records.map(r => r.key).filter(Boolean);

            if (keys.length === 0) {
                return res.status(200).json({
                    message: "No valid S3 keys found",
                    deletedCount: 0
                });
            }

            // ────────────────────────────────────────────────
            //  Delete from S3 first
            // ────────────────────────────────────────────────
            const s3Result = await s3Service.deleteMultipleFiles(keys);

            const successfullyDeleted = s3Result.deleted?.length ?? 0;
            const failedCount = s3Result.errors?.length ?? 0;

            // ────────────────────────────────────────────────
            //  Only then remove from DB (atomicity is still best-effort)
            // ────────────────────────────────────────────────
            let dbDeletedCount = 0;
            if (successfullyDeleted > 0) {
                const { deletedCount } = await DataLinks.deleteMany({
                    bookingid: bookingId,
                    key: { $in: s3Result.deleted.map(d => d.Key) }
                });
                dbDeletedCount = deletedCount;
            }

            // Decide response status
            if (failedCount === 0) {
                return res.status(200).json({
                    message: "All files deleted successfully",
                    deletedCount: successfullyDeleted,
                    dbRemoved: dbDeletedCount
                });
            }

            // Partial failure → 207 Multi-Status or just 200 + info
            return res.status(200).json({
                message: "Some files could not be deleted",
                deletedCount: successfullyDeleted,
                failedCount,
                dbRemoved: dbDeletedCount,
                failedKeys: s3Result.errors?.map(e => ({
                    key: e.Key,
                    code: e.Code,
                    message: e.Message
                })) ?? []
            });

        } catch (err) {
            console.error("deleteAllS3Files failed:", {
                bookingId: req.params.bookingId,
                error: err.message,
                stack: err.stack?.slice(0, 300)
            });

            return res.status(500).json({
                error: "Failed to delete files",
                message: err.message
            });
        }
    },


};
