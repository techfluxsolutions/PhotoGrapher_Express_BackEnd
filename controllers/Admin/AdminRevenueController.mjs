import Payment from "../../models/Payment.mjs";
import Payout from "../../models/Payout.mjs";
import ServiceBooking from "../../models/ServiceBookings.mjs";
import Photographer from "../../models/Photographer.mjs";
import mongoose from "mongoose";

class AdminRevenueController {
  /**
   * Get overall revenue dashboard for admin
   * GET /api/admins/revenue/dashboard
   */
  async getDashboard(req, res, next) {
    try {
      const { filter = "month" } = req.query; // today | month | year
      const now = new Date();
      let startDate;

      if (filter === "today") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (filter === "month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (filter === "year") {
        startDate = new Date(now.getFullYear(), 0, 1);
      } else {
        startDate = new Date(0); // All time
      }

      // 1. Calculate Total Sales (Payments from clients)
      const salesStats = await Payment.aggregate([
        { $match: { payment_status: "paid", payment_date: { $gte: startDate } } },
        { 
          $group: { 
            _id: null, 
            totalAmount: { $sum: "$upfront_amount" },
            count: { $sum: 1 } 
          } 
        }
      ]);

      // 2. Calculate Total Payouts to Photographers
      const payoutStats = await Payout.aggregate([
        { $match: { status: "Paid", payout_date: { $gte: startDate } } },
        { 
          $group: { 
            _id: null, 
            totalPaid: { $sum: "$paid_amount" },
            count: { $sum: 1 } 
          } 
        }
      ]);

      const totalSales = salesStats[0]?.totalAmount || 0;
      const totalPayouts = payoutStats[0]?.totalPaid || 0;
      const platformEarnings = totalSales - totalPayouts;

      // 3. Graph Data (Monthly for last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);

      const monthlyStats = await Payment.aggregate([
        { 
          $match: { 
            payment_status: "paid", 
            payment_date: { $gte: sixMonthsAgo } 
          } 
        },
        {
          $group: {
            _id: { 
              year: { $year: "$payment_date" }, 
              month: { $month: "$payment_date" } 
            },
            amount: { $sum: "$upfront_amount" }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]);

      // Format graph data for all 6 months even if zero
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const graphData = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date(sixMonthsAgo);
        d.setMonth(d.getMonth() + i);
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        
        const match = monthlyStats.find(s => s._id.month === month && s._id.year === year);
        graphData.push({
          label: `${monthNames[month - 1]} ${year}`,
          sales: match ? match.amount : 0
        });
      }

      // 4. Pending Revenue (Outstanding from clients)
      const pendingRevenue = await Payment.aggregate([
        { $match: { payment_status: "pending" } },
        { $group: { _id: null, total: { $sum: "$outstanding_amount" } } }
      ]);

      return res.json({
        success: true,
        data: {
          metrics: {
            totalSales,
            totalPayouts,
            platformEarnings,
            pendingFromClients: pendingRevenue[0]?.total || 0
          },
          graphData,
          filter
        }
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get top earning photographers
   * GET /api/admins/revenue/top-photographers
   */
  async getTopPhotographers(req, res, next) {
    try {
      const topPhotographers = await Payout.aggregate([
        { $match: { status: "Paid" } },
        {
          $group: {
            _id: "$photographer_id",
            totalEarnings: { $sum: "$paid_amount" },
            bookingCount: { $sum: 1 }
          }
        },
        { $sort: { totalEarnings: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "photographers",
            localField: "_id",
            foreignField: "_id",
            as: "details"
          }
        },
        { $unwind: "$details" },
        {
          $project: {
            _id: 1,
            totalEarnings: 1,
            bookingCount: 1,
            name: "$details.basicInfo.fullName",
            email: "$details.email",
            mobile: "$details.mobileNumber"
          }
        }
      ]);

      return res.json({
        success: true,
        data: topPhotographers
      });
    } catch (err) {
      return next(err);
    }
  }
}

export default new AdminRevenueController();
