import Notification from "../../models/Notification.mjs";
import { sendSuccessResponse, sendErrorResponse } from "../../utils/handleResponce.mjs";
import mongoose from "mongoose";
import admin from "../../utils/firebaseAdmin.mjs";

class NotificationController {
    // Get notifications for the authenticated photographer
    async getNotifications(req, res) {
        try {
            const photographer_id = req.user?.id;

            if (!photographer_id) {
                return sendErrorResponse(res, "Unauthorized", 401);
            }

            // Fetch real notifications from DB (if any)
            let realNotifications = [];
            if (photographer_id) {
                realNotifications = await Notification.find({ photographer_id: new mongoose.Types.ObjectId(photographer_id) })
                    .sort({ createdAt: -1 })
                    .limit(20);
            }

            const demoNotifications = []; // Removed confusing demo data

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
            const EVENT_LABELS = {
                booking_assigned      : "Booking Assigned",
                booking_invite        : "Booking Invitation",
                booking_status_update : "Booking Status Update",
                job_update            : "Job Update",
                payment               : "Payment",
                review                : "Review",
                system                : "System",
                reminder              : "Reminder",
            };

            const formattedReal = realNotifications.map(n => {
                const ist = formatIST(n.createdAt);
                return {
                    _id: n._id,
                    event: EVENT_LABELS[n.notification_type] || n.notification_type.replace(/_/g, " ").toUpperCase(),
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

    // Mark notification as read...
    async markAsRead(req, res) {
        try {
            const { id } = req.params;
            if (id.startsWith("demo")) {
                return sendSuccessResponse(res, null, "Demo notification marked as read");
            }

            const notification = await Notification.findOneAndUpdate(
                { _id: id, photographer_id: req.user?.id },
                { read_status: true },
                { new: true }
            );
            if (!notification) {
                return sendErrorResponse(res, { message: "Notification not found" }, 404);
            }

            return sendSuccessResponse(res, notification, "Notification marked as read");
        } catch (error) {
            return sendErrorResponse(res, error, 500);
        }
    }

    // Send a test notification using an FCM token
    async sendTestNotification(req, res) {
        try {
            const { fcmToken, title, body, data } = req.body;

            if (!fcmToken) {
                return sendErrorResponse(res, "FCM Token is required", 400);
            }

            const message = {
                notification: {
                    title: title || "Test Notification",
                    body: body || "This is a test notification from PhotoGrapher Express",
                },
                data: data || {},
                token: fcmToken,
            };

            const response = await admin.messaging().send(message);
            return sendSuccessResponse(res, { messageId: response }, "Test notification sent successfully");
        } catch (error) {
            console.error("FCM Test Error:", error);
            return sendErrorResponse(res, error, 500);
        }
    }
}

export default new NotificationController();
