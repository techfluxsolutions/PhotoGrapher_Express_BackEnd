import {
    CreateMultipartUploadCommand
} from "@aws-sdk/client-s3";
import s3 from "../../utils/serverS3/spacesClient.js";
import DataLinks from "../../models/DataLinks.js";
export const startUpload = async (req, res) => {
    try {
        const { fileName, fileType } = req.body;
        if (!fileName || !fileType) {
            return res.status(400).json({ message: "Nothing is selected" });
        }

        const command = new CreateMultipartUploadCommand({
            Bucket: process.env.AWS_BUCKET,
            Key: `uploads/${Date.now()}-${fileName}`,
            ContentType: fileType,
        });

        const data = await s3.send(command);

        res.json({
            uploadId: data.UploadId,
            key: data.Key
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

import {
    UploadPartCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const getUploadPartUrl = async (req, res) => {
    try {
        const { key, uploadId, partNumber } = req.body;
        if (!key || !uploadId || !partNumber) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const command = new UploadPartCommand({
            Bucket: process.env.AWS_BUCKET,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber,
        });

        const url = await getSignedUrl(s3, command, { expiresIn: 36000 });

        res.json({ url });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

import {
    CompleteMultipartUploadCommand
} from "@aws-sdk/client-s3";

export const completeUpload = async (req, res) => {
    try {
        const { key, uploadId, parts, bookingid, clientId, photographerId, veroaBookingId } = req.body;
        if (!key || !uploadId || !parts || !bookingid || !clientId || !photographerId || !veroaBookingId) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const command = new CompleteMultipartUploadCommand({
            Bucket: process.env.AWS_BUCKET,
            Key: key,
            UploadId: uploadId,
            MultipartUpload: {
                Parts: parts
            }
        });

        await s3.send(command);

        const fileUrl = `${process.env.SPACES_CDN_URL}/${key}`;
        const savedDatalink = await DataLinks.create({
            dataLink: fileUrl,
            bookingid: bookingid,
            clientId: clientId,
            photographerId: photographerId,
            veroaBookingId

        })
        res.json({
            message: "Upload complete",
            savedDatalink
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};