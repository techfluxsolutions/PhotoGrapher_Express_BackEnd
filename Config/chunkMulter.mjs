import multer from "multer";

export const chunkUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB max per chunk to prevent OOM
});
