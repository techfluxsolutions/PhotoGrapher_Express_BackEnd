import { s3Service } from "../lib/s3Service.js";
import DataLinks from "../models/DataLinks.js";

export const uploadController = {
    // 1. Init multipart upload
    startUpload: async (req, res) => {
        try {
            const { fileName, fileType } = req.body;

            if (!fileName || !fileType) {
                return res.status(400).json({ error: "fileName and fileType are required." });
            }

            const data = await s3Service.startMultipartUpload(fileName, fileType);
            res.status(200).json(data);
        } catch (error) {
            console.error("Start upload error:", error);
            res.status(500).json({ error: error.message });
        }
    },

    // 2. Upload a 20MB chunk 
    // Mutler saves the chunk in Memory temporarily via req.file.buffer
    uploadChunk: async (req, res) => {
        try {
            const { key, uploadId, partNumber } = req.body;
            console.log("=== CHUNK UPLOAD DETAILS ===");
            console.log("Body:", req.body);
            console.log("File:", req.file);
            console.log("Files:", req.files);

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
            res.status(500).json({ error: error.message });
        }
    },

    // 3. Finalize
    completeUpload: async (req, res) => {
        try {
            const { key, uploadId, parts, bookingid, clientId, photographerId, veroaBookingId } = req.body;

            if (!key || !uploadId || !parts || !Array.isArray(parts)) {
                return res.status(400).json({ error: "key, uploadId, and parts array are required." });
            }

            const fileUrl = await s3Service.completeMultipartUpload(key, uploadId, parts);
            const savedDatalink = await DataLinks.create({
                dataLink: fileUrl,
                key: key,
                bookingid: bookingid,
                clientId: clientId,
                photographerId: photographerId,
                veroaBookingId
            })
            res.status(200).json({ message: "Upload complete successfully", fileUrl, key, savedDatalink });
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
        try {
            // e.g. /upload/uploads/123-video.mp4
            const key = req.params.key;
            const range = req.headers.range;

            if (!key) {
                return res.status(400).json({ error: "File key is required." });
            }

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
                return res.status(404).json({ error: "File not found." });
            }
            console.error("Stream error:", error);
            res.status(500).json({ error: error.message });
        }
    }
};
