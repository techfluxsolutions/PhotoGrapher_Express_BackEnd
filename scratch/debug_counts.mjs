
import mongoose from 'mongoose';
import ServiceBooking from '../models/ServiceBookings.mjs';

async function checkCounts() {
  await mongoose.connect("mongodb+srv://mohsin:Hire_Roofers@hireroofers.az6w7wp.mongodb.net/photographer?retryWrites=true&w=majority");
  
  const now = new Date();
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
  const todayStartIST = new Date(`${todayStr}T00:00:00.000+05:30`);

  console.log("Today IST Start:", todayStartIST.toISOString());
  console.log("Today Str:", todayStr);

  const stats = await ServiceBooking.aggregate([
    {
      $match: {
        bookingStatus: "accepted",
        status: { $ne: "canceled" }
      }
    },
    {
      $group: {
        _id: "$photographer_id",
        totalAccepted: { $sum: 1 },
        upcoming: {
           $sum: {
             $cond: [
               {
                 $and: [
                    { $nin: ["$status", ["completed"]] },
                    {
                      $or: [
                        { $gte: ["$bookingDate", todayStartIST] },
                        { $gte: ["$startDate", todayStr] },
                        { $gte: ["$eventDate", todayStr] }
                      ]
                    }
                 ]
               },
               1, 0
             ]
           }
        },
        completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        noDateAtAll: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$bookingDate", null] },
                  { $eq: ["$startDate", null] },
                  { $eq: ["$eventDate", null] }
                ]
              },
              1, 0
            ]
          }
        }
      }
    }
  ]);

  console.log(JSON.stringify(stats, null, 2));
  process.exit();
}

checkCounts();
