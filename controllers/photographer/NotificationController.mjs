import Notification from "../../models/Notification.mjs";
import { sendSuccessResponse, sendErrorResponse } from "../../utils/handleResponce.mjs";

class NotificationController {
    // Get notifications for the authenticated photographer
    async getNotifications(req, res) {
        try {
            const photographer_id = req.user?._id || req.photographer?._id;

            if (!photographer_id) {
                // If no auth during testing, we can still show demo data
                // but usually we should have req.user from authMiddleware
            }

            // Fetch real notifications from DB (if any)
            let realNotifications = [];
            if (photographer_id) {
                realNotifications = await Notification.find({ photographer_id })
                    .sort({ createdAt: -1 })
                    .limit(20);
            }

            // Demo Data as requested
            const demoNotifications = [
                {
                    _id: "demo1",
                    event: "New Booking Request",
                    message: "You have a new wedding photography request from New York.",
                    time: "2 minutes ago",
                    type: "job_update",
                    read_status: false,
                    createdAt: new Date(Date.now() - 2 * 60000)
                },
                {
                    _id: "demo2",
                    event: "Payment Received",
                    message: "Partial payment for VEROA-BK-000007 has been confirmed.",
                    time: "1 hour ago",
                    type: "payment",
                    read_status: true,
                    createdAt: new Date(Date.now() - 60 * 60000)
                },
                {
                    _id: "demo3",
                    event: "Review Posted",
                    message: "A client just left a 5-star review on your profile!",
                    time: "5 hours ago",
                    type: "review",
                    read_status: false,
                    createdAt: new Date(Date.now() - 300 * 60000)
                },
                {
                    _id: "demo4",
                    event: "System Update",
                    message: "The platform has been updated with new portfolio management features.",
                    time: "1 day ago",
                    type: "system",
                    read_status: true,
                    createdAt: new Date(Date.now() - 86400000)
                }
            ];

            // Combine real data with demo data (real data first)
            // Formatting real data to match demo structure if needed
            const formattedReal = realNotifications.map(n => ({
                _id: n._id,
                event: n.notification_type.replace("_", " ").toUpperCase(),
                message: n.notification_message,
                time: "Just now", // In a real app, use a helper like timeAgo
                type: n.notification_type,
                read_status: n.read_status,
                createdAt: n.createdAt
            }));

            const allNotifications = [...formattedReal, ...demoNotifications];

            return sendSuccessResponse(res, {
                notifications: allNotifications,
                count: allNotifications.length,
                unreadCount: allNotifications.filter(n => !n.read_status).length
            }, "Notifications fetched successfully");

        } catch (error) {
            return sendErrorResponse(res, error, 500);
        }
    }

    // Mark notification as read
    async markAsRead(req, res) {
        try {
            const { id } = req.params;
            if (id.startsWith("demo")) {
                return sendSuccessResponse(res, null, "Demo notification marked as read");
            }

            const notification = await Notification.findByIdAndUpdate(id, { read_status: true }, { new: true });
            if (!notification) {
                return sendErrorResponse(res, { message: "Notification not found" }, 404);
            }

            return sendSuccessResponse(res, notification, "Notification marked as read");
        } catch (error) {
            return sendErrorResponse(res, error, 500);
        }
    }
}

export default new NotificationController();
