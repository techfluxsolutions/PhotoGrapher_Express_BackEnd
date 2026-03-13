import express from "express";
import multer from "multer";
import { uploadController } from "../controllers/uploadController.js";

const router = express.Router();

// Use memory storage for chunks. Limits to memory processing safe for chunks.
// A typical chunk size is 5MB-20MB.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB Memory limit max per chunk
});

// APIs
router.post("/start", uploadController.startUpload);
router.post("/get-part-url", uploadController.getPartUploadUrl);
router.post("/chunk", upload.single("chunk"), uploadController.uploadChunk);
router.post("/complete", uploadController.completeUpload);
router.post("/abort", uploadController.abortUpload);

// Use wildcard param to match full S3 key e.g., /upload/uploads/movie.mp4
router.get("/*key", uploadController.streamFile);

export default router;
