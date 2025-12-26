import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "+" + Math.round(Math.random() * 1e9);
    cb(null, `${unique}-${file.originalname}`);
  },
});

export const uploadSingle = (fieldName) =>
  multer({ storage }).single(fieldName);
export const uploadMultiple = (fieldName, maxCount = 5) =>
  multer({ storage }).array(fieldName, maxCount);
