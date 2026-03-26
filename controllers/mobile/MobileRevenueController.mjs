import Payout from "../../models/Payout.mjs";
import mongoose from "mongoose";

class MobileRevenueController {
  async getRevenueDashboard(req, res, next) {
    try {
      // Assuming auth middleware populates req.user.id
      const photographerId = req.user?.id || req.user?._id; 
      
      if (!photographerId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      // Fetch payouts for this photographer
      let payouts = await Payout.find({ photographer_id: photographerId });

      // --- DUMMY DATA SEEDING FOR TESTING ---
      if (payouts.length === 0) {
        console.log("No payouts found, creating dummy data for testing...");
        const dummyPayouts = [];
        const baseAmounts = [2000, 1500, 0, 3000, 2000, 0, 5000]; // Dummy amounts for the last 7 days
        
        for (let i = 0; i < 7; i++) {
          if (baseAmounts[i] > 0) {
            const dDate = new Date();
            dDate.setDate(dDate.getDate() - i);
            
            dummyPayouts.push({
              photographer_id: photographerId,
              booking_id: new mongoose.Types.ObjectId(), // Fake booking ID
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
      // --------------------------------------

      const now = new Date();
      // Normalize to current day start (midnight)
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayOfYear = new Date(now.getFullYear(), 0, 1);

      let todayRevenue = 0;
      let monthRevenue = 0;
      let yearRevenue = 0;

      // Initialize graph data for the last 7 days (including today)
      const graphData = [];
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateString = `${monthNames[d.getMonth()]} ${d.getDate()}`;
        graphData.push({ date: dateString, amount: 0, _date: d });
      }

      payouts.forEach(p => {
        const amount = p.paid_amount || 0;
        if (!p.payout_date) return;
        
        const pDate = new Date(p.payout_date);
        const pDateOnly = new Date(pDate.getFullYear(), pDate.getMonth(), pDate.getDate());

        // Check if today
        if (pDateOnly.getTime() === today.getTime()) {
          todayRevenue += amount;
        }

        // Check if within current month
        if (pDate >= firstDayOfMonth) {
          monthRevenue += amount;
        }

        // Check if within current year
        if (pDate >= firstDayOfYear) {
          yearRevenue += amount;
        }

        // Add to graph data if it falls within the last 7 days
        const graphIndex = graphData.findIndex(g => g._date.getTime() === pDateOnly.getTime());
        if (graphIndex !== -1) {
          graphData[graphIndex].amount += amount;
        }
      });

      // Format graph data to remove the temporary _date object
      const formattedGraphData = graphData.map(g => ({
        date: g.date,
        amount: g.amount
      }));

      return res.status(200).json({
        success: true,
        data: {
          todayRevenue,
          monthRevenue,
          yearRevenue,
          graphData: formattedGraphData
        }
      });

    } catch (err) {
      return next(err);
    }
  }
}

export default new MobileRevenueController();
