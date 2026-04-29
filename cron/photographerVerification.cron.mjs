import cron from "node-cron";
import Photographer from "../models/Photographer.mjs";
import ServiceBooking from "../models/ServiceBookings.mjs";
export const photographerVerificationCron = () => {
    // Run every day at midnight
    cron.schedule("0 0 * * *", async () => {
        try {
            console.log("[CRON] Running photographer verification check...");
            
            // Calculate date 30 days ago
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Get all verified photographers to check
            const photographers = await Photographer.find({ isVerified: true });

            for (const photographer of photographers) {
                // Count canceled/rejected ServiceBookings in the last 30 days
                const serviceCancellations = await ServiceBooking.countDocuments({
                    photographer_id: photographer._id,
                    $or: [{ status: "canceled" }, { bookingStatus: "rejected" }],
                    updatedAt: { $gte: thirtyDaysAgo }
                });

                const totalCancellations = serviceCancellations;

                if (totalCancellations >= 3) {
                    photographer.isVerified = false;
                    await photographer.save();
                    console.log(`[CRON] Photographer ${photographer._id} has been unverified due to ${totalCancellations} cancellations/rejections in the last 30 days.`);
                }
            }

            console.log("[CRON] Photographer verification check completed.");
        } catch (error) {
            console.error("[CRON] Error in photographerVerificationCron:", error);
        }
    });
};