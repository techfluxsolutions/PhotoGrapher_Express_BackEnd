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

            // Helper to format date to IST (Separate Date and Time)
            const formatIST = (date) => {
                const d = new Date(date);
                const datePart = new Intl.DateTimeFormat("en-IN", {
                    timeZone: "Asia/Kolkata",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }).format(d);

                const timePart = new Intl.DateTimeFormat("en-IN", {
                    timeZone: "Asia/Kolkata",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true
                }).format(d);

                return { date: datePart, time: timePart };
            };

            // Helper for Time Ago
            const getTimeAgo = (date) => {
                const seconds = Math.floor((new Date() - new Date(date)) / 1000);
                let interval = Math.floor(seconds / 31536000);

                if (interval > 1) return interval + " years ago";
                interval = Math.floor(seconds / 2592000);
                if (interval > 1) return interval + " months ago";
                interval = Math.floor(seconds / 86400);
                if (interval > 1) return interval + " days ago";
                interval = Math.floor(seconds / 3600);
                if (interval > 1) return interval + " hours ago";
                interval = Math.floor(seconds / 60);
                if (interval > 1) return interval + " minutes ago";
                return Math.floor(seconds) + " seconds ago";
            };

            // Combine real data with demo data (real data first)
            const formattedReal = realNotifications.map(n => {
                const ist = formatIST(n.createdAt);
                return {
                    _id: n._id,
                    event: n.notification_type.replace("_", " ").toUpperCase(),
                    message: n.notification_message,
                    date: ist.date,
                    time: ist.time,
                    timeAgo: getTimeAgo(n.createdAt),
                    type: n.notification_type,
                    read_status: n.read_status,
                    createdAt: n.createdAt
                };
            });

            const allNotifications = [
                ...formattedReal,
                ...demoNotifications.map(d => {
                    const ist = formatIST(d.createdAt);
                    return {
                        ...d,
                        date: ist.date,
                        time: ist.time,
                        timeAgo: getTimeAgo(d.createdAt)
                    };
                })
            ];




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
