import EditingPlan from "../../models/EditingPlan.mjs";
import Cart from "../../models/Cart.mjs";
import { s3Service } from "../../lib/s3Service.js";
import DataLinks from "../../models/DataLinks.js";
import ServiceBooking from "../../models/ServiceBookings.mjs";
import mongoose from "mongoose";
class EditingController {
    async getAll(req, res, next) {
        try {
            const editingPlans = await EditingPlan.find();
            res.status(200).json({ success: true, data: editingPlans });
        } catch (error) {
            next(error);
        }
    }

    async getStandardPlans(req, res, next) {
        try {
            const editingPlans = await EditingPlan.find({ planCategory: "standard" });
            res.status(200).json({ success: true, data: editingPlans });
        } catch (error) {
            next(error);
        }
    }

    async getPremiumPlans(req, res, next) {
        try {
            const editingPlans = await EditingPlan.find({ planCategory: "premium" });
            res.status(200).json({ success: true, data: editingPlans });
        } catch (error) {
            next(error);
        }
    }


    async getOne(req, res, next) {
        try {
            const { id } = req.params;
            const editingPlan = await EditingPlan.findById(id);
            if (!editingPlan) return res.status(404).json({ success: false, message: "Editing plan not found" });
            res.status(200).json({ success: true, data: editingPlan });
        } catch (error) {
            next(error);
        }
    }
    // ✅ Update Quantity (Increase / Decrease)
    async updateQuantity(req, res) {
        try {
            const userId = req.user.id;

            let { editingPlanId, planName, action } = req.body;

            // ✅ validate action
            if (!["increase", "decrease"].includes(action)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid action",
                });
            }

            // ✅ Get plan name if only ID provided
            if (editingPlanId && !planName) {
                const plan = await EditingPlan.findById(editingPlanId);

                if (!plan) {
                    return res.status(404).json({
                        success: false,
                        message: "Editing plan not found",
                    });
                }

                planName = plan.planName;
            }

            // ✅ Find Active Cart
            const cart = await Cart.findOne({
                userId: userId,
                status: "active",
            });

            if (!cart) {
                return res.status(404).json({
                    success: false,
                    message: "Cart not found",
                });
            }

            // ✅ Find Item Index
            const itemIndex = cart.items.findIndex(
                (i) => (editingPlanId ? i.planId?.toString() === editingPlanId : i.name === planName) && i.category === "editing"
            );

            if (itemIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: "Item not found in cart",
                });
            }

            const item = cart.items[itemIndex];

            // 🔥 MAIN LOGIC
            if (action === "increase") {
                item.quantity += 1;
            }

            if (action === "decrease") {
                if (item.quantity > 1) {
                    item.quantity -= 1;
                } else {
                    // remove item
                    cart.items.splice(itemIndex, 1);
                }
            }

            // ✅ Recalculate total
            cart.totalAmount = cart.items.reduce(
                (acc, i) => acc + i.price * i.quantity,
                0
            );

            await cart.save();

            res.status(200).json({
                success: true,
                message:
                    action === "increase"
                        ? "Quantity increased"
                        : "Quantity decreased",
                cart,
            });
        } catch (error) {
            console.error(error);

            res.status(500).json({
                success: false,
                message: "Server error",
            });
        }
    }
    async addToCart(req, res) {
        try {
            const userId = req.user.id;
            const { editingPlanId, quantity = 1, selectedRoleId } = req.body;
            console.log("Editing")
            // ✅ Find Editing Plan
            const plan = await EditingPlan.findById(editingPlanId);

            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: "Editing plan not found",
                });
            }

            // ✅ Find or Create Cart
            let cart = await Cart.findOne({
                userId: userId,
                status: "active",
            });

            if (!cart) {
                cart = new Cart({
                    userId: userId,
                    items: [],
                });
            }

            // ✅ Check existing item by planId
            const existingItem = cart.items.find(
                (item) => item.planId?.toString() === editingPlanId && item.category === "editing"
            );
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                cart.items.push({
                    name: plan.planName,
                    category: "editing",
                    price: plan.price,
                    quantity,
                    planId: editingPlanId,
                    selectedroleId: selectedRoleId

                });
            }

            // Recalculate totalAmount
            cart.totalAmount = cart.items.reduce((acc, i) => acc + (i.price * i.quantity), 0);

            await cart.save();

            res.status(200).json({
                success: true,
                message: "Editing plan added to cart",
                cart,
            });
        } catch (error) {
            console.error("Add to cart error:", error);

            res.status(500).json({
                success: false,
                message: "Server error",
            });
        }
    }

    async getMyCart(req, res) {
        try {
            const userId = req.user.id;
            const cart = await Cart.findOne({ userId, status: "active" });

            res.status(200).json({
                success: true,
                cart: cart || { items: [], totalAmount: 0 },
            });
        } catch (error) {
            console.error("Get cart error:", error);
            res.status(500).json({
                success: false,
                message: "Server error",
            });
        }
    }
    async getplanBynumberOfVideos(req, res) {
        try {
            const numberOfVideos = req.params.numberOfvideos;
            const plans = await EditingPlan.find({ numberOfVideos: numberOfVideos });
            if (!plans) {
                return res.status(404).json({ success: false, message: "Editing plans not found" });
            }
            res.status(200).json({ success: true, message: "Editing plans fetched successfully", plans });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getplanByPlanCategory(req, res) {
        try {
            const plansDetails = await EditingPlan.find({ planCategory: "standard" }).select('numberOfVideos price subtitle');

            if (!plansDetails) {
                res.status(200).json({ success: true, message: "No plan found please contact admin", plansDetails: [] });
            }
            res.status(200).json({ success: true, message: "Editing plans fetched successfully", plansDetails });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getEditingPlans(req, res) {
        try {
            const editingPlans = await EditingPlan.find();
            res.status(200).json({ success: true, message: "Editing plans fetched successfully", editingPlans });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // --- Upload APIs for Editing (Raw Footage) ---

    async startUpload(req, res) {
        try {
            const { fileName, fileType, relativePath, veroaBookingId, fileSize } = req.body;

            if (!fileName || !fileType || !veroaBookingId) {
                return res.status(400).json({ error: "fileName, fileType, and veroaBookingId are required." });
            }

            let key;
            if (relativePath) {
                key = `editing-raw/${veroaBookingId}/${relativePath}`;
            } else {
                key = `editing-raw/${veroaBookingId}/${Date.now()}-${fileName.replace(/\s+/g, "-")}`;
            }

            const STRATEGY_THRESHOLD = 100 * 1024 * 1024; // 100MB
            const CHUNK_SIZE = 20 * 1024 * 1024; // 20MB parts

            if (fileSize && fileSize < STRATEGY_THRESHOLD) {
                const uploadUrl = await s3Service.getPresignedUrl(key, fileType);
                return res.status(200).json({
                    strategy: "single",
                    uploadUrl,
                    key
                });
            } else {
                const { uploadId, key: s3Key } = await s3Service.startMultipartUpload(fileName, fileType, key);
                return res.status(200).json({
                    strategy: "multipart",
                    uploadId,
                    key: s3Key,
                    chunkSize: CHUNK_SIZE
                });
            }
        } catch (error) {
            console.error("Editing startUpload error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    async getPartUploadUrl(req, res) {
        try {
            const { key, uploadId, partNumber } = req.body;
            if (!key || !uploadId || !partNumber) {
                return res.status(400).json({ error: "key, uploadId, and partNumber are required." });
            }
            const uploadUrl = await s3Service.getPresignedUrlForPart(key, uploadId, parseInt(partNumber, 10));
            res.status(200).json({ uploadUrl });
        } catch (error) {
            console.error("Editing getPartUploadUrl error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    async uploadChunk(req, res) {
        try {
            const { key, uploadId, partNumber } = req.body;
            const fileBuffer = req.file?.buffer;

            if (!key || !uploadId || !partNumber || !fileBuffer) {
                return res.status(400).json({ error: "Missing required fields" });
            }

            const partInfo = await s3Service.uploadChunk(key, uploadId, parseInt(partNumber, 10), fileBuffer);
            res.status(200).json(partInfo);
        } catch (error) {
            console.error("Editing uploadChunk error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    async completeUpload(req, res) {
        try {
            const { key, uploadId, parts, bookingid, veroaBookingId } = req.body;
            const userId = req.user.id;

            if (!key || !parts || !Array.isArray(parts)) {
                return res.status(400).json({ error: "key and parts array are required." });
            }

            let fileUrl;
            if (uploadId) {
                fileUrl = await s3Service.completeMultipartUpload(key, uploadId, parts);
            } else {
                const baseUrl = process.env.SPACES_CDN_URL || process.env.AWS_PUBLIC_URL || "";
                fileUrl = `${baseUrl}/${key}`;
            }

            // Extract folder path
            const folderPath = key.substring(0, key.lastIndexOf("/"));

            const savedDatalink = await DataLinks.create({
                dataLink: fileUrl,
                key: key,
                folderPath, // Note: This should be added to DataLinks schema if not present
                bookingid,
                clientId: userId,
                veroaBookingId
            });

            res.status(200).json({
                message: "Upload complete successfully",
                fileUrl,
                key,
                savedDatalink
            });
        } catch (error) {
            console.error("Editing completeUpload error:", error);
            res.status(500).json({ error: error.message });
        }
    }

    async abortUpload(req, res) {
        try {
            const { key, uploadId } = req.body;
            if (!key || !uploadId) {
                return res.status(400).json({ error: "key and uploadId are required." });
            }
            await s3Service.abortMultipartUpload(key, uploadId);
            res.status(200).json({ message: "Upload aborted and cleaned up." });
        } catch (error) {
            console.error("Editing abortUpload error:", error);
            res.status(500).json({ error: error.message });
        }
    }
}

export default new EditingController();