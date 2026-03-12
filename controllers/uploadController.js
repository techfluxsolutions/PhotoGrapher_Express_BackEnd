import { s3Service } from "../lib/s3Service.js";
import DataLinks from "../models/DataLinks.js";
import archiver from "archiver";
import mongoose from "mongoose";
export const uploadController = {
    // 1. Init multipart upload
    // old one 
    // startUpload: async (req, res) => {
    //     try {
    //         const { fileName, fileType } = req.body;

    //         if (!fileName || !fileType) {
    //             return res.status(400).json({ error: "fileName and fileType are required." });
    //         }

    //         const data = await s3Service.startMultipartUpload(fileName, fileType);
    //         res.status(200).json(data);
    //     } catch (error) {
    //         console.error("Start upload error:", error);
    //         res.status(500).json({ error: error.message });
    //     }
    // },
    // accept files and the folder here 

    //
    startUpload: async (req, res) => {
        try {

            const { fileName, fileType, relativePath, veroaBookingId } = req.body;

            if (!fileName || !fileType) {
                return res.status(400).json({
                    error: "fileName and fileType are required."
                });
            }

            let key;

            // If folder upload
            if (relativePath) {
                key = `uploads/${veroaBookingId}/${relativePath}`;
            }
            // If single file
            else {
                key = `uploads/${veroaBookingId}/${Date.now()}-${fileName}`;
            }

            const data = await s3Service.startMultipartUpload(fileName, fileType, key);

            res.status(200).json({
                ...data,
                key: data.key // Use the key returned by S3 service for consistency
            });

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

    // 3. Finalize
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

            if (!key || !uploadId || !parts || !Array.isArray(parts)) {
                return res.status(400).json({
                    error: "key, uploadId, and parts array are required."
                });
            }

            const fileUrl = await s3Service.completeMultipartUpload(key, uploadId, parts);

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
    streamProtectedFile: async (req, res) => {
        let key = null;
        try {
            key = req.params.key || req.params[0];
            const range = req.headers.range;
            const userId = req.user.id;
            const requestedBookingId = req.params.bookingId;



            if (!key) {
                return res.status(400).json({ error: "File key is required." });
            }

            // Handle key: it might be a string or an array depending on wildcard capture
            if (Array.isArray(key)) {
                key = key.join('/');
            }

            // Sanitize key: ensure it is a string and remove leading slashes or asterisk 
            key = String(key || "").replace(/^[\/\*]+/, "");

            // Verify access in DataLinks database
            const query = {
                bookingid: new mongoose.Types.ObjectId(requestedBookingId)
            };

            const linkRecord = await DataLinks.findOne(query);

            if (!linkRecord) {
                return res.status(403).json({
                    error: "Unauthorized access. You do not have permission to view this file or the booking ID mismatch."
                });
            }
            // if (linkRecord) {
            //     return res.status(200).json({
            //         message: "File found in DataLinks database.",
            //         linkRecord,
            //         key
            //     })
            // }
            const data = await s3Service.getFileStream(
                key,
                range);

            // Set inline disposition
            res.setHeader("Content-Disposition", `inline; filename="${key.split('/').pop()}"`);

            if (data.ContentType) res.setHeader("Content-Type", data.ContentType);
            if (data.ContentLength) res.setHeader("Content-Length", data.ContentLength);
            if (data.ContentRange) res.setHeader("Content-Range", data.ContentRange);
            if (data.AcceptRanges) res.setHeader("Accept-Ranges", data.AcceptRanges);

            const statusCode = range ? 206 : 200;
            res.status(statusCode);

            data.Body.pipe(res);

        } catch (error) {


            if (error.name === "NoSuchKey") {
                return res.status(404).json({
                    error: "File not found in S3.",
                    triedKey: key
                });
            }
            res.status(500).json({
                error: error.message,
                details: error.name
            });
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

            if (!key || !bookingId) {
                return res.status(400).json({ error: "Missing required fields." });
            }
            const s3Data = await s3Service.deleteMultipleFiles(key);
            if (s3Data) {
                await DataLinks.deleteMany({ bookingid: bookingId, key: { $in: key } });
            }
            res.status(200).json({ message: "Files deleted successfully." });
        } catch (error) {
            console.error("Delete file error:", error);
            res.status(500).json({ error: error.message });
        }
    },



};
