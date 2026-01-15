import express from "express";
<<<<<<< HEAD
import ChatController from "../controllers/User/ChatController.mjs";
=======
import ChatController from "../controllers/ChatController.mjs";
>>>>>>> 0ab2d67 (chatting feature)
import authMiddleware from "../middleware/authmiddleware.mjs";

import { chatRoleCheck } from "../middleware/chatRoleCheck.mjs";

const router = express.Router();

// Apply auth middleware to all chat routes
router.use(authMiddleware);
// Apply role check middleware
router.use(chatRoleCheck);

router.get("/conversations", (req, res, next) => ChatController.getConversations(req, res, next));
router.get("/messages/:bookingId", (req, res, next) => ChatController.getMessages(req, res, next));

export default router;
