import multer from "multer";
import path from "path";
import fs from "fs";

const createUploader = ({
    folder = "uploads",
    maxSizeMB = 10,
    allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|mp4|webm|mp3|wav/,
} = {}) => {
    // ensure directory exists
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, folder);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(
                null,
                `${file.fieldname}-${uniqueSuffix}${path.extname(
                    file.originalname
                )}`
            );
        },
    });

    return multer({
        storage,
        limits: { fileSize: maxSizeMB * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            const extname = allowedTypes.test(
                path.extname(file.originalname).toLowerCase()
            );
            const mimetype = allowedTypes.test(file.mimetype);

            if (extname && mimetype) {
                cb(null, true);
            } else {
                cb(
                    new Error(
                        "Invalid file type. File format not allowed."
                    )
                );
            }
        },
    });
};

export default createUploader;
