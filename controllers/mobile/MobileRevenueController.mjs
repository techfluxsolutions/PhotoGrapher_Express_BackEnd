import Payout from "../../models/Payout.mjs";
import mongoose from "mongoose";

class MobileRevenueController {
  async getRevenueDashboard(req, res, next) {
    try {
      const photographerId = req.user?.id || req.user?._id;
      const { filter = "today" } = req.query; // today | month | year

      if (!photographerId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      let payouts = await Payout.find({ photographer_id: photographerId });

      // --- Dummy Data (same as yours) ---
      if (payouts.length === 0) {
        const dummyPayouts = [];
        const baseAmounts = [2000, 1500, 0, 3000, 2000, 0, 5000];

        for (let i = 0; i < 7; i++) {
          if (baseAmounts[i] > 0) {
            const dDate = new Date();
            dDate.setDate(dDate.getDate() - i);

            dummyPayouts.push({
              photographer_id: photographerId,
              booking_id: new mongoose.Types.ObjectId(),
              total_amount: baseAmounts[i],
              paid_amount: baseAmounts[i],
              pending_amount: 0,
              status: "Paid",
              payout_date: dDate
            });
          }
        }

        await Payout.insertMany(dummyPayouts);
        payouts = await Payout.find({ photographer_id: photographerId });
      }
      // ---------------------------------

      const now = new Date();

      let startDate;
      let graphData = [];

      // 👉 FILTER LOGIC
      if (filter === "today") {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        graphData.push({
          label: "Today",
          amount: 0,
          _date: startDate
        });

      } else if (filter === "month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);

        const daysInMonth = now.getDate();
        for (let i = daysInMonth - 1; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);

          graphData.push({
            label: d.getDate().toString(),
            amount: 0,
            _date: new Date(d.getFullYear(), d.getMonth(), d.getDate())
          });
        }

      } else if (filter === "year") {
        startDate = new Date(now.getFullYear(), 0, 1);

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        for (let i = 0; i < 12; i++) {
          graphData.push({
            label: monthNames[i],
            amount: 0,
            month: i
          });
        }
      }

      let totalRevenue = 0;

      payouts.forEach(p => {
        if (!p.payout_date) return;

        const amount = p.paid_amount || 0;
        const pDate = new Date(p.payout_date);

        // Skip if outside range
        if (pDate < startDate) return;

        totalRevenue += amount;

        if (filter === "today") {
          graphData[0].amount += amount;

        } else if (filter === "month") {
          const index = graphData.findIndex(
            g => g._date.getTime() === new Date(
              pDate.getFullYear(),
              pDate.getMonth(),
              pDate.getDate()
            ).getTime()
          );

          if (index !== -1) graphData[index].amount += amount;

        } else if (filter === "year") {
          const monthIndex = pDate.getMonth();
          graphData[monthIndex].amount += amount;
        }
      });

      // Clean response
      const formattedGraphData = graphData.map(g => ({
        label: g.label,
        amount: g.amount
      }));

      return res.status(200).json({
        success: true,
        filter,
        totalRevenue,
        graphData: formattedGraphData
      });

    } catch (err) {
      return next(err);
    }
  }
}

export default new MobileRevenueController();