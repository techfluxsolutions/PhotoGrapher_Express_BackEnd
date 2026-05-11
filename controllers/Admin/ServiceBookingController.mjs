import ServiceBooking from "../../models/ServiceBookings.mjs";
import Payout from "../../models/Payout.mjs";
import Gallery from "../../models/Gallery.mjs";
import Photographer from "../../models/Photographer.mjs";
import User from "../../models/User.mjs";
import PlatformSettings from "../../models/PlatformSettings.mjs";
import { sendBookingSMS, sendMessageCentral, retryMessageCentral } from "../../utils/messageCentral.mjs";
import mongoose from "mongoose";
import Message from "../../models/Message.mjs";
import Counter from "../../models/Counter.mjs";
import Notification from "../../models/Notification.mjs";
import { emitNotificationCount } from "../../services/SocketService.mjs";
import admin from "../../utils/firebaseAdmin.mjs";
import PhotographyPlan from "../../models/PhotographyPlan.mjs";
import EditingPlan from "../../models/EditingPlan.mjs";
import TeamShootPlan from "../../models/TeamShootPlan.mjs";
import Package from "../../models/Package.mjs";
import Service from "../../models/Service.mjs";
import HourlyShootService from "../../models/HourlyShootService.mjs";
import Cart from "../../models/Cart.mjs";
import DataLinks from "../../models/DataLinks.js";

import { s3Service } from "../../lib/s3Service.js";

const parseDDMMYYYY = (dateStr) => {
  if (!dateStr || dateStr instanceof Date) return dateStr;

  // Custom DD-MM-YYYY format (e.g., 20-03-2026)
  const bits = dateStr.split("-");
  if (bits.length === 3) {
    const [d, m, y] = bits;
    // If first part is 4 digits, it's likely YYYY-MM-DD, use standard parsing
    if (d.length === 4) return new Date(dateStr);
    // Otherwise assume DD-MM-YYYY and rearrange for JS Date
    return new Date(`${y}-${m}-${d}`);
  }

  return new Date(dateStr);
};
class ServiceBookingController {
  /**
   * Create a new service booking
   * POST /api/admins/bookings
   */
  async create(req, res, next) {
    try {
      const payload = req.body;
      payload.bookingDate = parseDDMMYYYY(payload.bookingDate);

      // Get next booking sequence atomically
      const counter = await Counter.findByIdAndUpdate(
        "veroaBookingId",
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      const nextNumber = counter.seq;

      // Pad number to 6 digits
      const formattedNumber = String(nextNumber).padStart(6, "0");

      payload.veroaBookingId = `VEROA-BK-${formattedNumber}`;

      if (payload.startDate && payload.startDate === payload.endDate) {
        payload.bookingDate = parseDDMMYYYY(payload.startDate);
        payload.endDate = "";
        payload.startDate = "";
      }

      // ─── Calculate Photographer Amount if needed ───
      if (payload.photographer_id && payload.totalAmount && payload.photographerAmount === undefined) {
          try {
              const [photographer, settings] = await Promise.all([
                  Photographer.findById(payload.photographer_id),
                  PlatformSettings.findOne({ type: "commissions" })
              ]);

              if (photographer) {
                  const global = settings || { initio: 0, elite: 0, pro: 0 };
                  const level = photographer.professionalDetails?.expertiseLevel?.toUpperCase() || "INITIO";
                  let commission = photographer.commissionPercentage;

                  if (!commission) {
                      if (level === "INITIO") commission = global.initio;
                      else if (level === "ELITE") commission = global.elite;
                      else if (level === "PRO") commission = global.pro;
                  }

                  payload.photographerAmount = Math.round(payload.totalAmount * (1 - (commission || 0) / 100));
              }
          } catch (err) {
              console.error("[Commission] Calculation error in create:", err.message);
          }
      }

      const booking = await ServiceBooking.create(payload);

      // ─── Create Payout Summary if photographer is assigned ───
      if (booking.photographer_id) {
          try {
              await Payout.create({
                  booking_id: booking._id,
                  photographer_id: booking.photographer_id,
                  total_amount: booking.totalAmount,
                  photographer_share: booking.photographerAmount || 0,
                  shootType: booking.serviceCategory === "editing" ? "PhotoEditing" : (booking.serviceCategory === "hourly" ? "HourlyShoot" : "Service"),
                  status: "Pending",
              });
          } catch (payoutErr) {
              console.error("[Payout] Error creating payout on create:", payoutErr.message);
          }
      }

      return res.status(201).json({
        success: true,
        data: booking,
      });

    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get all service bookings with pagination
   * GET /api/admins/bookings
   */
  async list(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      let filter = {};
      // Strict Date Range Filter
      const { startDate, endDate } = req.query;
      if (startDate || endDate) {
        if (!startDate || !endDate) {
          return res.status(200).json({ success: false, message: "Both startDate and endDate must be provided." });
        }
        const sDate = new Date(startDate);
        const eDate = new Date(endDate);
        if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) {
          return res.status(200).json({ success: false, message: "Invalid startDate or endDate format." });
        }
        if (sDate > eDate) {
          return res.status(200).json({ success: false, message: "startDate cannot be greater than endDate." });
        }

        sDate.setUTCHours(0, 0, 0, 0);
        eDate.setUTCHours(23, 59, 59, 999);
        const fs = sDate.toISOString().split("T")[0];
        const ts = eDate.toISOString().split("T")[0];

        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [
            { bookingDate: { $gte: sDate, $lte: eDate } },
            { startDate: { $gte: fs, $lte: ts } },
          ]
        });
      }

      const [items, total] = await Promise.all([
        ServiceBooking.find(filter)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .populate("service_id client_id photographer_id quoteId cartId")
          .populate({
            path: "cartId",
            populate: { path: "items.planId" }
          }),
        ServiceBooking.countDocuments(filter),
      ]);

      const formattedItems = items.map(booking => {
        const ist = booking.ist_bookingDate || "N/A";
        const [d, t] = ist.includes(", ") ? ist.split(", ") : [ist, "N/A"];
        const dateVal = (d && d !== "N/A") ? d : (booking.startDate || (booking.bookingDate ? booking.bookingDate.toISOString().split("T")[0] : "N/A"));

        // Construct Venue if address is missing
        const displayAddress = booking.address || booking.location || ""

        return {
          bookingId: booking._id,
          veroaBookingId: booking.veroaBookingId,
          client_id: booking.client_id?._id || null,
          client_name: booking.client_id?.username || "",
          photographer_id: booking.photographer_id?._id || null,
          assigned_photographer: (booking.status === "canceled") ? "" : (booking.photographer_id?.basicInfo?.fullName || ""),
          team_studio: (booking.status === "canceled") ? "" : (booking.photographer_id?.professionalDetails?.team_studio || booking.team || ""),
          eventType: booking.service_id?.serviceName || "",
          eventDate: booking.bookingDate,
          location: displayAddress || booking.city || "",
          lat: booking.lat || null,
          lng: booking.lng || null,
          address: displayAddress,
          note: booking.notes || "",
          requirements: booking.notes || (booking.quoteId?.requirements?.length > 0 ? booking.quoteId.requirements.join(", ") : booking.quoteId?.photographyRequirements) || "No requirements",
          status: booking.status,
          date: dateVal,
          time: t || "N/A",
          startDate: booking.startDate || (booking.bookingDate ? booking.bookingDate.toISOString().split("T")[0] : null),
          endDate: booking.endDate || (booking.bookingDate ? booking.bookingDate.toISOString().split("T")[0] : null),
          bookingAmount: booking.totalAmount,
          photographerAmount: booking.photographerAmount || 0,
          paymentMode: booking.paymentMode,
          paymentStatus: booking.paymentStatus,
          bookingStatus: booking.bookingStatus || booking.status,
          galleryStatus: booking.galleryStatus || "Upload Pending",
          subCategoryName: (booking.cartId?.items?.[0]?.subCategoryName || booking.editingbookings?.[0]?.subCategoryName || booking.editingPackages?.[0]?.subCategoryName || booking.hourlyPackages?.[0]?.subCategoryName || ""),
          subCategoryType: (booking.cartId?.items?.[0]?.subCategoryType || booking.editingbookings?.[0]?.subCategoryType || booking.editingbookings?.[0]?.category || booking.editingPackages?.[0]?.subCategoryType || booking.editingPackages?.[0]?.category || booking.hourlyPackages?.[0]?.subCategoryType || booking.hourlyPackages?.[0]?.category || ""),
        };
      });

      return res.json({
        success: true,
        data: formattedItems,
        meta: { total, page, limit },
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get upcoming bookings (bookingDate >= today)
   * GET /api/admins/bookings/upcoming
   */
  // async getUpcoming(req, res, next) {
  //   try {
  //     const page = Math.max(1, parseInt(req.query.page) || 1);
  //     const limit = Math.max(1, parseInt(req.query.limit) || 20);
  //     const skip = (page - 1) * limit;

  //     const today = new Date();
  //     today.setHours(0, 0, 0, 0);

  //     let filter = {
  //       bookingDate: { $gte: today },
  //     };

  //     // Add date range filter if provided
  //     if (req.query.fromDate && req.query.toDate) {
  //       const fromDate = new Date(req.query.fromDate);
  //       const toDate = new Date(req.query.toDate);
  //       toDate.setHours(23, 59, 59, 999);

  //       filter.bookingDate = {
  //         $gte: fromDate,
  //         $lte: toDate,
  //       };
  //     }

  //     const [items, total] = await Promise.all([
  //       ServiceBooking.find(filter)
  //         .skip(skip)
  //         .limit(limit)
  //         .sort({ createdAt: -1 })
  //         .populate("service_id client_id photographer_id"),
  //       ServiceBooking.countDocuments(filter),
  //     ]);

  //     const formattedItems = items.map(booking => ({
  //       bookingId: booking._id,
  //       veroaBookingId: booking.veroaBookingId,
  //       client_id: booking.client_id ? booking.client_id._id : null,
  //       client_name: booking.client_id ? booking.client_id.username : "",
  //       assigned_photographer: booking.photographer_id ? booking.photographer_id.username : "",
  //       team_studio: booking.team || "",
  //       eventType: booking.shootType || "",
  //       eventDate: booking.bookingDate,
  //       location: booking.city || "",
  //       note: booking.notes || "",
  //       status: booking.status,
  //       date: "",
  //       bookingAmount: booking.totalAmount,
  //       paymenyMode: booking.paymentMode,
  //       paymentType: booking.paymentStatus,
  //       bookingStatus: booking.status,

  //     }));

  //     return res.json({
  //       success: true,
  //       data: formattedItems,
  //       meta: { total, page, limit },
  //     });
  //   } catch (err) {
  //     return next(err);
  //   }
  // }


  async getUpcoming(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      let filter = {};
      const { startDate, endDate, fromDate, toDate } = req.query;
      const start = (startDate || fromDate || "").trim();
      const end = (endDate || toDate || "").trim();

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split("T")[0];

      if (start && end) {
        const sDate = new Date(start);
        const eDate = new Date(end);
        if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) {
          return res.status(200).json({ success: false, message: "Invalid date format." });
        }
        if (sDate > eDate) {
          return res.status(200).json({ success: false, message: "fromDate cannot be greater than toDate." });
        }
        sDate.setUTCHours(0, 0, 0, 0);
        eDate.setUTCHours(23, 59, 59, 999);
        const fs = sDate.toISOString().split("T")[0];
        const ts = eDate.toISOString().split("T")[0];

        // 📅 RANGE SEARCH for UPCOMING: BOTH start and end must be within [fs, ts] AND be today or future AND PAID
        filter.$and = [
          // Must be today or future
          {
            $or: [
              { endDate: { $ne: null, $ne: "", $gte: todayStr } },
              { $and: [{ endDate: { $in: [null, ""] } }, { startDate: { $ne: null, $ne: "", $gte: todayStr } }] },
              { $and: [{ endDate: { $in: [null, ""] } }, { startDate: { $in: [null, ""] } }, { bookingDate: { $gte: today } }] }
            ]
          },
          // Must not be pending payment
          { paymentStatus: { $ne: "pending" } },
          // BOTH start and end must be within the date range [fs, ts]
          {
            $or: [
              // Has both startDate and endDate - BOTH must be within range
              {
                $and: [
                  { startDate: { $ne: null, $ne: "" } },
                  { endDate: { $ne: null, $ne: "" } },
                  { startDate: { $gte: fs, $lte: ts } },
                  { endDate: { $gte: fs, $lte: ts } }
                ]
              },
              // No endDate but has startDate - startDate must be within range
              {
                $and: [
                  { endDate: { $in: [null, ""] } },
                  { startDate: { $ne: null, $ne: "" } },
                  { startDate: { $gte: fs, $lte: ts } }
                ]
              },
              // No endDate/startDate - bookingDate must be within range
              {
                $and: [
                  { endDate: { $in: [null, ""] } },
                  { startDate: { $in: [null, ""] } },
                  { bookingDate: { $gte: sDate, $lte: eDate } }
                ]
              }
            ]
          }
        ];
      } else {
        // 📅 DEFAULT VIEW: Upcoming/Active AND PAID
        filter.$and = [
          {
            $or: [
              // Case 1: Has endDate (string) - must be >= today
              {
                $and: [
                  { endDate: { $exists: true, $ne: null, $ne: "" } },
                  { endDate: { $gte: todayStr } }
                ]
              },
              // Case 2: No endDate but has startDate (string) - must be >= today
              {
                $and: [
                  { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: "" }] },
                  { startDate: { $exists: true, $ne: null, $ne: "" } },
                  { startDate: { $gte: todayStr } }
                ]
              },
              // Case 3: No endDate/startDate, use bookingDate (Date) - must be >= today
              {
                $and: [
                  { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: "" }] },
                  { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: "" }] },
                  { bookingDate: { $exists: true } },
                  { bookingDate: { $gte: today } }
                ]
              }
            ]
          },
          { paymentStatus: { $ne: "pending" } }
        ];
      }

      const [items, total] = await Promise.all([
        ServiceBooking.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).populate("service_id client_id photographer_id quoteId cartId").populate({
          path: "cartId",
          populate: { path: "items.planId" }
        }),
        ServiceBooking.countDocuments(filter),
      ]);

      // ─── Resolve Names for Hourly Packages ───
      const allStaffIds = new Set();
      items.forEach(booking => {
        if (booking.hourlyPackages) {
          booking.hourlyPackages.forEach(pkg => {
            (pkg.assignedPhotographers || []).forEach(id => allStaffIds.add(id.toString()));
            (pkg.assignedVideographers || []).forEach(id => allStaffIds.add(id.toString()));
            (pkg.assignedEditors || []).forEach(id => allStaffIds.add(id.toString()));
            (pkg.assignedLighting || []).forEach(id => allStaffIds.add(id.toString()));
          });
        }
      });

      const staffNamesMap = {};
      if (allStaffIds.size > 0) {
        const staffDocs = await Photographer.find({ _id: { $in: Array.from(allStaffIds) } }, "basicInfo.fullName").lean();
        staffDocs.forEach(s => staffNamesMap[s._id.toString()] = s.basicInfo?.fullName || "Unknown");
      }

      const formattedItems = items.map(booking => {
        const ist = booking.ist_bookingDate || "N/A";
        const [d, t] = ist.includes(", ") ? ist.split(", ") : [ist, "N/A"];
        const dateVal = (d && d !== "N/A") ? d : (booking.startDate || (booking.bookingDate ? booking.bookingDate.toISOString().split("T")[0] : "N/A"));

        // Construct Venue if address is missing
        const displayAddress = booking.address || booking.location || ""

        // Process hourly packages for this booking
        let hourlyPackages = [];
        if (booking.hourlyPackages && booking.hourlyPackages.length > 0) {
          hourlyPackages = booking.hourlyPackages.map(pkg => ({
            ...pkg,
            category: pkg.category ? (pkg.category.charAt(0).toUpperCase() + pkg.category.slice(1)) : "Standard",
            hours: pkg.hours || (booking.hours ? `${booking.hours} Hours` : "N/A"),
            assignedPhotographerNames: (pkg.assignedPhotographers || []).map(id => staffNamesMap[id.toString()] || "Unknown"),
            assignedVideographerNames: (pkg.assignedVideographers || []).map(id => staffNamesMap[id.toString()] || "Unknown"),
            assignedEditorNames: (pkg.assignedEditors || []).map(id => staffNamesMap[id.toString()] || "Unknown"),
            assignedLightingNames: (pkg.assignedLighting || []).map(id => staffNamesMap[id.toString()] || "Unknown")
          }));
        } else if (booking.cartId && booking.cartId.items) {
          // Fallback to cart items if hourlyPackages not generated yet
          const packagesMap = {};
          booking.cartId.items.forEach(item => {
            let duration = "N/A";
            const match = item.name.match(/\((.*?)\)/);
            if (match) duration = match[1];
            else if (booking.hours) duration = `${booking.hours} Hours`;
            const cat = item.subCategoryType ? (item.subCategoryType.charAt(0).toUpperCase() + item.subCategoryType.slice(1)) : "Standard";
            const key = `${duration}-${cat}`;
            if (!packagesMap[key]) packagesMap[key] = { hours: duration, category: cat, services: [] };
            packagesMap[key].services.push({
              name: item.name.split(" (")[0].trim(),
              qty: item.quantity,
              price: item.price * item.quantity
            });
          });
          hourlyPackages = Object.values(packagesMap);
        }

        return {
          bookingId: booking._id,
          veroaBookingId: booking.veroaBookingId,
          client_id: booking.client_id?._id || null,
          client_name: booking.client_id?.username || "",
          photographer_id: booking.photographer_id?._id || null,
          assigned_photographer: (booking.status === "canceled") ? "" : (booking.photographer_id?.basicInfo?.fullName || ""),
          team_studio: (booking.status === "canceled") ? "" : (booking.photographer_id?.professionalDetails?.team_studio || booking.team || ""),
          eventType: booking.service_id?.serviceName || "",
          eventDate: booking.bookingDate,
          location: displayAddress || booking.city || "",
          lat: booking.lat || null,
          lng: booking.lng || null,
          address: displayAddress,
          note: booking.notes || "",
          requirements: booking.notes || (booking.quoteId?.requirements?.length > 0 ? booking.quoteId.requirements.join(", ") : booking.quoteId?.photographyRequirements) || "No requirements",
          status: booking.status,
          date: dateVal,
          time: t || "N/A",
          startDate: booking.startDate || (booking.bookingDate ? booking.bookingDate.toISOString().split("T")[0] : null),
          endDate: booking.endDate || (booking.bookingDate ? booking.bookingDate.toISOString().split("T")[0] : null),
          bookingAmount: booking.totalAmount,
          photographerAmount: booking.photographerAmount || 0,
          paymentMode: booking.paymentMode,
          paymentStatus: booking.paymentStatus,
          bookingStatus: booking.bookingStatus || booking.status,
          galleryStatus: booking.galleryStatus || "Upload Pending",
          subCategoryName: (booking.cartId?.items?.[0]?.subCategoryName || booking.editingbookings?.[0]?.subCategoryName || booking.editingPackages?.[0]?.subCategoryName || booking.hourlyPackages?.[0]?.subCategoryName || ""),
          subCategoryType: (booking.cartId?.items?.[0]?.subCategoryType || booking.editingbookings?.[0]?.subCategoryType || booking.editingbookings?.[0]?.category || booking.editingPackages?.[0]?.subCategoryType || booking.editingPackages?.[0]?.category || booking.hourlyPackages?.[0]?.subCategoryType || booking.hourlyPackages?.[0]?.category || ""),
          hourlyPackages: hourlyPackages
        };
      });

      return res.json({ success: true, data: formattedItems, meta: { total, page, limit } });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Something went wrong", error: error.message });
    }
  }


  /**
   * Get previous bookings (bookingDate < today)
   * GET /api/admins/bookings/previous
   */
  async getPrevious(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      let filter = {};
      const { startDate, endDate, fromDate, toDate } = req.query;
      const start = (startDate || fromDate || "").trim();
      const end = (endDate || toDate || "").trim();

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split("T")[0];

      if (start && end) {
        const sDate = new Date(start);
        const eDate = new Date(end);
        if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) {
          return res.status(200).json({ success: false, message: "Invalid date format." });
        }
        if (sDate > eDate) {
          return res.status(200).json({ success: false, message: "fromDate cannot be greater than toDate." });
        }
        sDate.setUTCHours(0, 0, 0, 0);
        eDate.setUTCHours(23, 59, 59, 999);
        const fs = sDate.toISOString().split("T")[0];
        const ts = eDate.toISOString().split("T")[0];

        // 📅 RANGE SEARCH for PREVIOUS: BOTH start and end must be within [fs, ts] AND be before today
        filter.$and = [
          // Must be before today
          {
            $or: [
              { endDate: { $ne: null, $ne: "", $lt: todayStr } },
              { $and: [{ endDate: { $in: [null, ""] } }, { startDate: { $ne: null, $ne: "", $lt: todayStr } }] },
              { $and: [{ endDate: { $in: [null, ""] } }, { startDate: { $in: [null, ""] } }, { bookingDate: { $lt: today } }] }
            ]
          },
          // BOTH start and end must be within the date range [fs, ts]
          {
            $or: [
              // Has both startDate and endDate - BOTH must be within range
              {
                $and: [
                  { startDate: { $ne: null, $ne: "" } },
                  { endDate: { $ne: null, $ne: "" } },
                  { startDate: { $gte: fs, $lte: ts } },
                  { endDate: { $gte: fs, $lte: ts } }
                ]
              },
              // No endDate but has startDate - startDate must be within range
              {
                $and: [
                  { endDate: { $in: [null, ""] } },
                  { startDate: { $ne: null, $ne: "" } },
                  { startDate: { $gte: fs, $lte: ts } }
                ]
              },
              // No endDate/startDate - bookingDate must be within range
              {
                $and: [
                  { endDate: { $in: [null, ""] } },
                  { startDate: { $in: [null, ""] } },
                  { bookingDate: { $gte: sDate, $lte: eDate } }
                ]
              }
            ]
          }
        ];
      } else {
        // 📅 DEFAULT VIEW: Finished bookings (already passed)
        filter.$or = [
          // Case 1: Has endDate (string) - must be < today
          {
            $and: [
              { endDate: { $exists: true, $ne: null, $ne: "" } },
              { endDate: { $lt: todayStr } }
            ]
          },
          // Case 2: No endDate but has startDate (string) - must be < today
          {
            $and: [
              { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: "" }] },
              { startDate: { $exists: true, $ne: null, $ne: "" } },
              { startDate: { $lt: todayStr } }
            ]
          },
          // Case 3: No endDate/startDate, use bookingDate (Date) - must be < today
          {
            $and: [
              { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: "" }] },
              { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: "" }] },
              { bookingDate: { $exists: true } },
              { bookingDate: { $lt: today } }
            ]
          }
        ];
      }

      const [items, total] = await Promise.all([
        ServiceBooking.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }).populate("service_id client_id photographer_id quoteId cartId").populate({
          path: "cartId",
          populate: { path: "items.planId" }
        }),
        ServiceBooking.countDocuments(filter),
      ]);

      const formattedItems = items.map(booking => {
        const ist = booking.ist_bookingDate || "N/A";
        const [d, t] = ist.includes(", ") ? ist.split(", ") : [ist, "N/A"];
        const dateVal = (d && d !== "N/A") ? d : (booking.startDate || (booking.bookingDate ? booking.bookingDate.toISOString().split("T")[0] : "N/A"));

        // Construct Venue if address is missing
        const displayAddress = booking.address || booking.location || ""

        return {
          bookingId: booking._id,
          veroaBookingId: booking.veroaBookingId,
          client_id: booking.client_id?._id || null,
          client_name: booking.client_id?.username || "",
          photographer_id: booking.photographer_id?._id || null,
          assigned_photographer: (booking.status === "canceled") ? "" : (booking.photographer_id?.basicInfo?.fullName || ""),
          team_studio: (booking.status === "canceled") ? "" : (booking.photographer_id?.professionalDetails?.team_studio || booking.team || ""),
          eventType: booking.service_id?.serviceName || "",
          eventDate: booking.bookingDate,
          location: displayAddress || booking.city || "",
          lat: booking.lat || null,
          lng: booking.lng || null,
          address: displayAddress,
          note: booking.notes || "",
          requirements: booking.notes || (booking.quoteId?.requirements?.length > 0 ? booking.quoteId.requirements.join(", ") : booking.quoteId?.photographyRequirements) || "No requirements",
          status: booking.status,
          date: dateVal,
          time: t || "N/A",
          startDate: booking.startDate || (booking.bookingDate ? booking.bookingDate.toISOString().split("T")[0] : null),
          endDate: booking.endDate || (booking.bookingDate ? booking.bookingDate.toISOString().split("T")[0] : null),
          bookingAmount: booking.totalAmount,
          photographerAmount: booking.photographerAmount || 0,
          paymentMode: booking.paymentMode,
          paymentStatus: booking.paymentStatus,
          bookingStatus: booking.bookingStatus || booking.status,
          galleryStatus: booking.galleryStatus || "Upload Pending",
          subCategoryName: (booking.cartId?.items?.[0]?.subCategoryName || booking.editingbookings?.[0]?.subCategoryName || booking.editingPackages?.[0]?.subCategoryName || booking.hourlyPackages?.[0]?.subCategoryName || ""),
          subCategoryType: (booking.cartId?.items?.[0]?.subCategoryType || booking.editingbookings?.[0]?.subCategoryType || booking.editingbookings?.[0]?.category || booking.editingPackages?.[0]?.subCategoryType || booking.editingPackages?.[0]?.category || booking.hourlyPackages?.[0]?.subCategoryType || booking.hourlyPackages?.[0]?.category || ""),
        };
      });

      return res.json({ success: true, data: formattedItems, meta: { total, page, limit } });
    } catch (err) {
      return next(err);
    }
  }


  /**
   * Get single service booking by ID
   * GET /api/admins/bookings/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      let booking;

      if (mongoose.Types.ObjectId.isValid(id)) {
        booking = await ServiceBooking.findById(id)
          .populate("service_id client_id photographer_id quoteId cartId")
          .populate({
            path: "cartId",
            populate: { path: "items.planId" }
          });
      } else {
        booking = await ServiceBooking.findOne({ veroaBookingId: id })
          .populate("service_id client_id photographer_id quoteId cartId")
          .populate({
            path: "cartId",
            populate: { path: "items.planId" }
          });
      }

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "ServiceBooking not found"
        });
      }

      // ─── Aggregate Hourly Packages (Same logic as getHourlyBookings) ───────
      const packagesMap = {};
      
      // 1. New Structure (DB storage)
      if (booking.hourlyPackages && booking.hourlyPackages.length > 0) {
        booking.hourlyPackages.forEach((pkg, idx) => {
          const cat = pkg.category ? (pkg.category.charAt(0).toUpperCase() + pkg.category.slice(1)) : "Standard";
          const duration = pkg.hours || (booking.hours ? `${booking.hours} Hours` : "N/A");
          packagesMap[`pkg-${idx}`] = {
            hours: duration,
            category: cat,
            services: pkg.services || [],
            assignedPhotographers: pkg.assignedPhotographers || [],
            assignedVideographers: pkg.assignedVideographers || [],
            assignedEditors: pkg.assignedEditors || [],
            assignedLighting: pkg.assignedLighting || []
          };
        });
      }
      // 2. Fallback (Cart items)
      else if (booking.cartId && booking.cartId.items) {
        booking.cartId.items.forEach(item => {
          let duration = "N/A";
          const match = item.name.match(/\((.*?)\)/);
          if (match) duration = match[1];
          else if (booking.hours) duration = `${booking.hours} Hours`;
          const cat = item.subCategoryType ? (item.subCategoryType.charAt(0).toUpperCase() + item.subCategoryType.slice(1)) : "Standard";
          const key = `${duration}-${cat}`;
          if (!packagesMap[key]) packagesMap[key] = { hours: duration, category: cat, services: [] };
          packagesMap[key].services.push({
            name: item.name.split(" (")[0].trim(),
            qty: item.quantity,
            price: item.price * item.quantity
          });
        });
      }

      let hourlyPackages = Object.values(packagesMap);

      // 3. Name Lookup
      const allIds = new Set();
      hourlyPackages.forEach(p => {
        (p.assignedPhotographers || []).forEach(id => allIds.add(id.toString()));
        (p.assignedVideographers || []).forEach(id => allIds.add(id.toString()));
        (p.assignedEditors || []).forEach(id => allIds.add(id.toString()));
        (p.assignedLighting || []).forEach(id => allIds.add(id.toString()));
      });

      const globalNamesMap = {};
      if (allIds.size > 0) {
        const staff = await Photographer.find({ _id: { $in: Array.from(allIds) } }, "basicInfo.fullName").lean();
        staff.forEach(s => globalNamesMap[s._id.toString()] = s.basicInfo?.fullName || "Unknown");
      }

      hourlyPackages.forEach(p => {
        p.assignedPhotographerNames = (p.assignedPhotographers || []).map(id => globalNamesMap[id.toString()] || "Unknown");
        p.assignedVideographerNames = (p.assignedVideographers || []).map(id => globalNamesMap[id.toString()] || "Unknown");
        p.assignedEditorNames = (p.assignedEditors || []).map(id => globalNamesMap[id.toString()] || "Unknown");
        p.assignedLightingNames = (p.assignedLighting || []).map(id => globalNamesMap[id.toString()] || "Unknown");
      });

      const bookingData = booking.toObject();
      bookingData.hourlyPackages = hourlyPackages;
      const cartItem = bookingData.cartId?.items?.[0] || {};
      bookingData.subCategoryName = cartItem.subCategoryName || "";
      bookingData.subCategoryType = cartItem.subCategoryType || "";

      return res.json({
        success: true,
        data: bookingData
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Update service booking by ID
   * PUT /api/admins/bookings/:id
   */
  async update(req, res, next) {
    try {
      let { id } = req.params;
      const payload = req.body;

      // Resolve database _id if veroaBookingId is provided
      if (!mongoose.Types.ObjectId.isValid(id)) {
        const found = await ServiceBooking.findOne({ veroaBookingId: id }).select("_id");
        if (found) id = found._id;
      }

      // Parse booking date if provided in DD-MM-YYYY format
      if (payload.bookingDate && typeof payload.bookingDate === 'string') {
        const parseDDMMYYYY = (dateStr) => {
          const [day, month, year] = dateStr.split("-");
          return new Date(`${year}-${month}-${day}`);
        };
        payload.bookingDate = parseDDMMYYYY(payload.bookingDate);
      }

      // 🕒 Synchronize paymentStatus and related fields
      if (
        payload.paymentStatus === "paid" ||
        payload.paymentStatus === "fully paid" ||
        payload.full_Payment === true ||
        (payload.outStandingAmount !== undefined && Number(payload.outStandingAmount) === 0)
      ) {
        payload.paymentStatus = "fully paid";
        payload.fullyPaidAt = new Date();
        payload.full_Payment = true;
        payload.partial_Payment = false;
        payload.outStandingAmount = 0;
      } else if (
        payload.paymentStatus === "partially paid" ||
        payload.partial_Payment === true ||
        (payload.outStandingAmount && Number(payload.outStandingAmount) > 0)
      ) {
        payload.paymentStatus = "partially paid";
        payload.partial_Payment = true;
        payload.full_Payment = false;
      }

      // 🚫 If canceling, clear assignment
      if (payload.status === "canceled") {
        payload.photographer_id = null;
        payload.bookingStatus = "rejected";
        payload.photographerIds = [];
        payload.bookingOtp = null;
        payload.cancelledBy = "admin";
      }

      // 📸 Snapshot the old booking BEFORE update (so we can detect changes)
      const oldBooking = await ServiceBooking.findById(id).lean();

      // ─── Calculate Photographer Amount if needed ───
      const photographerId = payload.photographer_id || oldBooking?.photographer_id;
      const totalAmount = payload.totalAmount !== undefined ? payload.totalAmount : oldBooking?.totalAmount;

      if (photographerId && totalAmount && payload.photographerAmount === undefined) {
          try {
              const [photographer, settings] = await Promise.all([
                  Photographer.findById(photographerId),
                  PlatformSettings.findOne({ type: "commissions" })
              ]);

              if (photographer) {
                  const global = settings || { initio: 0, elite: 0, pro: 0 };
                  const level = photographer.professionalDetails?.expertiseLevel?.toUpperCase() || "INITIO";
                  let commission = photographer.commissionPercentage;

                  if (!commission) {
                      if (level === "INITIO") commission = global.initio;
                      else if (level === "ELITE") commission = global.elite;
                      else if (level === "PRO") commission = global.pro;
                  }

                  payload.photographerAmount = Math.round(totalAmount * (1 - (commission || 0) / 100));
              }
          } catch (err) {
              console.error("[Commission] Calculation error:", err.message);
          }
      }

      const booking = await ServiceBooking.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
      }).populate("service_id client_id photographer_id");

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "ServiceBooking not found"
        });
      }

      // ─── Notify photographer on status change (non-blocking) ──────────────
      if (oldBooking) {
        const assignedPhotographerId = oldBooking.photographer_id; // before cancel clears it
        const photographerIdToNotify = assignedPhotographerId || booking.photographer_id?._id;

        const statusChanged = payload.status && oldBooking.status !== payload.status;
        const bookingStatusChanged = payload.bookingStatus && oldBooking.bookingStatus !== payload.bookingStatus;

        if (photographerIdToNotify && (statusChanged || bookingStatusChanged)) {
          const bookingRef = booking.veroaBookingId || booking._id.toString();
          const eventName = booking.service_id?.serviceName || "your booking";

          // Human-readable messages per status (Short & Professional)
          const STATUS_MESSAGES = {
            confirmed: `Confirmed: ${bookingRef} (${eventName})`,
            completed: `Completed: ${bookingRef} (${eventName})`,
            canceled: `Canceled: ${bookingRef} (${eventName})`,
            pending: `Pending: ${bookingRef} (${eventName})`,
          };
          const BOOKING_STATUS_MESSAGES = {
            accepted: `Assignment Active: ${bookingRef}`,
            rejected: `Assignment Rejected: ${bookingRef}`,
            pending: `Action Required: Confirm ${bookingRef}`,
          };

          const message =
            (statusChanged && STATUS_MESSAGES[payload.status]) ||
            (bookingStatusChanged && BOOKING_STATUS_MESSAGES[payload.bookingStatus]) ||
            `The status of booking ${bookingRef} (${eventName}) has been updated by the admin.`;

          Notification.create({
            photographer_id: new mongoose.Types.ObjectId(photographerIdToNotify.toString()),
            notification_type: "booking_status_update",
            notification_message: message,
          }).then(() => {
            emitNotificationCount(photographerIdToNotify.toString());
          }).catch((err) => console.error("[Notification] booking_status_update error:", err.message));
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      // ─── Create or Update Payout Summary ───────────────────────────────
      if (booking.photographer_id) {
        try {
          await Payout.findOneAndUpdate(
            { booking_id: booking._id },
            {
              photographer_id: booking.photographer_id,
              total_amount: booking.totalAmount,
              photographer_share: booking.photographerAmount || 0,
              shootType: booking.serviceCategory === "editing" ? "PhotoEditing" : (booking.serviceCategory === "hourly" ? "HourlyShoot" : "Service"),
              status: "Pending",
            },
            { upsert: true, new: true }
          );
        } catch (payoutErr) {
          console.error("[Payout] Error syncing payout on update:", payoutErr.message);
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      return res.json({
        success: true,
        data: booking
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Delete service booking by ID
   * DELETE /api/admins/bookings/:id
   */
  async delete(req, res, next) {
    try {
      let { id } = req.params;

      // Resolve database _id if veroaBookingId is provided
      if (!mongoose.Types.ObjectId.isValid(id)) {
        const found = await ServiceBooking.findOne({ veroaBookingId: id }).select("_id");
        if (found) id = found._id;
      }

      const booking = await ServiceBooking.findByIdAndUpdate(
        id,
        {
          status: "canceled",
          bookingStatus: "rejected", // Mark as rejected/canceled for the photographer
          photographer_id: null,      // Clear assignment
          photographerIds: [],        // Clear any pending invitations
          bookingOtp: null,           // Clear OTP
          cancelledBy: "admin",
          cancelReason: req.body?.cancelReason || req.body?.cancellationReason || "Canceled by admin"
        },
        { new: true }
      );

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "ServiceBooking not found"
        });
      }

      return res.json({
        success: true,
        message: "ServiceBooking canceled successfully",
        data: booking
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get bookings by status
   * GET /api/admins/bookings/status/:status
   */
  async getByStatus(req, res, next) {
    try {
      const { status } = req.params;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        ServiceBooking.find({ status })
          .skip(skip)
          .limit(limit)
          .sort({ bookingDate: 1 })
          .populate("service_id client_id photographer_id"),
        ServiceBooking.countDocuments({ status }),
      ]);

      return res.json({
        success: true,
        data: items,
        meta: { total, page, limit, status },
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get bookings by client
   * GET /api/admins/bookings/client/:clientId
   */
  async getByClient(req, res, next) {
    try {
      const { clientId } = req.params;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        ServiceBooking.find({ client_id: clientId })
          .skip(skip)
          .limit(limit)
          .sort({ bookingDate: 1 })
          .populate("service_id client_id photographer_id"),
        ServiceBooking.countDocuments({ client_id: clientId }),
      ]);

      return res.json({
        success: true,
        data: items,
        meta: { total, page, limit },
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get bookings by photographer
   * GET /api/admins/bookings/photographer/:photographerId
   */
  async getByPhotographer(req, res, next) {
    try {
      const { photographerId } = req.params;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total] = await Promise.all([
        ServiceBooking.find({ photographer_id: photographerId })
          .skip(skip)
          .limit(limit)
          .sort({ bookingDate: 1 })
          .populate("service_id client_id photographer_id"),
        ServiceBooking.countDocuments({ photographer_id: photographerId }),
      ]);

      return res.json({
        success: true,
        data: items,
        meta: { total, page, limit },
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Assign photographer to a booking
   * PATCH /api/admins/bookings/:id/assign-photographer
   */
  async assignPhotographer(req, res, next) {
    try {
      const { photographerId, bookingId, photographerIds, _id, roleSelections } = req.body;
      const finalBookingIdRaw = bookingId || _id || req.params.id;
      let finalBookingId = finalBookingIdRaw;

      // Resolve database _id if veroaBookingId is provided
      if (finalBookingId && !mongoose.Types.ObjectId.isValid(finalBookingId)) {
        const found = await ServiceBooking.findOne({ veroaBookingId: finalBookingId }).select("_id");
        if (found) finalBookingId = found._id;
      }

      const booking = await ServiceBooking.findById(finalBookingId).populate("cartId");
      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found" });
      }

      const updateData = {};
      let isDirectAssign = false;

      // ─── Planwise Assignment (Hourly/Editing Packages) ──────────────────────────
      const { packageIndex: reqIndex, packageId, planType } = req.body;
      let packageIndex = reqIndex;

      if (packageIndex !== undefined && roleSelections) {
        const isEditing = booking.serviceCategory === "editing";
        let targetField = isEditing ? "editingPackages" : "hourlyPackages";

        // If packageIndex is not provided but packageId is, try to find it
        if (packageIndex === undefined && packageId) {
            const pkgs = booking[targetField] || [];
            const idx = pkgs.findIndex(p => 
                (p.packageId?.toString() === packageId.toString()) || 
                (p._id?.toString() === packageId.toString()) ||
                (p.planId?.toString() === packageId.toString()) ||
                (p.category?.toLowerCase() === planType?.toLowerCase())
            );
            if (idx !== -1) packageIndex = idx;
        }

        // Migration/Initialization: If target array is empty, build it from cart items
        if (!booking[targetField] || booking[targetField].length === 0) {
          if (booking.cartId && booking.cartId.items) {
            if (isEditing) {
              // ─── Build Editing Packages ───
              const editingItems = booking.cartId.items.filter(item => 
                (item.subCategoryName || "").toLowerCase() === "editing" ||
                (item.category || "").toLowerCase() === "editing"
              );
              booking.editingPackages = editingItems.map(item => ({
                planId: item.planId,
                planName: item.name,
                category: item.subCategoryType || (item.name.toLowerCase().includes("premium") ? "premium" : "standard"),
                price: item.price,
                numberOfVideos: item.quantity,
                assignedPhotographers: [],
                assignedVideographers: [],
                assignedEditors: [],
                assignedLighting: []
              }));
            } else {
              // ─── Build Hourly Packages ───
              const packagesMap = {};
              booking.cartId.items.forEach(item => {
                let duration = "N/A";
                const match = item.name.match(/\((.*?)\)/);
                if (match) duration = match[1];
                else if (booking.hours) duration = `${booking.hours} Hours`;

                const cat = item.subCategoryType ? (item.subCategoryType.charAt(0).toUpperCase() + item.subCategoryType.slice(1)) : "Standard";
                const key = `${duration}-${cat}`;
                if (!packagesMap[key]) {
                  packagesMap[key] = { hours: duration, category: cat, services: [] };
                }
                const cleanName = item.name.split(" (")[0].trim();
                packagesMap[key].services.push({
                  name: cleanName,
                  qty: item.quantity,
                  price: item.price * item.quantity
                });
              });
              Object.values(packagesMap).forEach(pkg => {
                pkg.subTotal = pkg.services.reduce((sum, s) => sum + (s.price || 0), 0);
                pkg.assignedPhotographers = [];
                pkg.assignedVideographers = [];
                pkg.assignedEditors = [];
                pkg.assignedLighting = [];
              });
              booking.hourlyPackages = Object.values(packagesMap);
            }
          }
        }

        const pkg = booking[targetField] && booking[targetField][packageIndex];
        if (pkg) {
          // 1. Normalize roleSelections keys to lowercase for consistent matching
          const normalizedSelections = {};
          if (roleSelections) {
            Object.keys(roleSelections).forEach(k => {
              normalizedSelections[k.toLowerCase()] = roleSelections[k];
            });
          }

          // Determine if this is a "Direct Assign" or "Broadcast Request"
          const { actionType } = req.body;
          
          if (actionType === 'assign') {
            isDirectAssign = true;
            // 2. Merge existing assignments with new selections for Direct Assignment
            const mergeRole = (existing = [], incoming = []) => {
              const set = new Set([...existing.map(id => id.toString()), ...incoming.map(id => id.toString())]);
              return Array.from(set).map(id => new mongoose.Types.ObjectId(id));
            };

            pkg.assignedPhotographers = mergeRole(pkg.assignedPhotographers || [], normalizedSelections.photographer || []);
            pkg.assignedVideographers = mergeRole(pkg.assignedVideographers || [], normalizedSelections.videographer || []);
            pkg.assignedEditors = mergeRole(pkg.assignedEditors || [], normalizedSelections.editor || []);
            pkg.assignedLighting = mergeRole(pkg.assignedLighting || [], normalizedSelections.lightingsetup || normalizedSelections.lightingSetup || normalizedSelections.lighting || []);

            // Consolidate all photographers from all packages for top-level photographerIds
            const allPhotographers = new Set();
            booking.hourlyPackages.forEach(p => {
              if (p.assignedPhotographers) p.assignedPhotographers.forEach(id => allPhotographers.add(id.toString()));
            });
            updateData.photographerIds = Array.from(allPhotographers);
          } 
          else if (actionType === 'request') {
            isDirectAssign = false;
            // For Request/Broadcast, we MERGE everyone in the top-level photographerIds
            // to avoid removing existing assigned/invited photographers.
            const allSelectedIds = new Set(booking.photographerIds?.map(id => id.toString()) || []);
            Object.values(roleSelections).forEach(ids => {
              if (Array.isArray(ids)) ids.forEach(id => allSelectedIds.add(id.toString()));
            });
            updateData.photographerIds = Array.from(allSelectedIds).map(id => new mongoose.Types.ObjectId(id));

            // Also record invitations at the plan level so the photographer knows WHICH plan they are invited for
            const roleIds = (normalizedSelections.editor || normalizedSelections.photographer || []).map(id => new mongoose.Types.ObjectId(id));
            if (isEditing) {
              pkg.invitedEditors = Array.from(new Set([...(pkg.invitedEditors || []).map(id => id.toString()), ...roleIds.map(id => id.toString())])).map(id => new mongoose.Types.ObjectId(id));
            } else {
              pkg.invitedPhotographers = Array.from(new Set([...(pkg.invitedPhotographers || []).map(id => id.toString()), ...roleIds.map(id => id.toString())])).map(id => new mongoose.Types.ObjectId(id));
            }
            
            // Do NOT clear photographer_id if it's already set (somebody has already accepted)
            if (booking.photographer_id) {
              updateData.photographer_id = booking.photographer_id;
            }
          }

          if (isDirectAssign) {
            updateData.bookingStatus = "accepted";
            updateData.status = "confirmed";
            updateData.acceptedAt = new Date();
            if (pkg.assignedPhotographers && pkg.assignedPhotographers.length > 0) {
              updateData.photographer_id = pkg.assignedPhotographers[0];
            }
          } else {
            // If already accepted by anyone OR someone is already assigned, keep it accepted
            const hasAssigned = booking.photographer_id || 
              (booking.hourlyPackages?.some(p => 
                (p.assignedPhotographers?.length > 0) || 
                (p.assignedVideographers?.length > 0) || 
                (p.assignedEditors?.length > 0) || 
                (p.assignedLighting?.length > 0)
              )) ||
              (booking.editingPackages?.some(p => 
                (p.assignedPhotographers?.length > 0) || 
                (p.assignedVideographers?.length > 0) || 
                (p.assignedEditors?.length > 0) || 
                (p.assignedLighting?.length > 0)
              ));

            if (booking.bookingStatus === "accepted" || hasAssigned) {
              updateData.bookingStatus = "accepted";
              updateData.status = "confirmed";
            } else {
              updateData.bookingStatus = "pending";
              updateData.status = "pending";
            }
          }

          updateData[targetField] = booking[targetField];
          booking.markModified(targetField);
        }
      }
      // ─── Legacy/Generic Assignment ────────────────────────────────────────
      else {
        const finalPhotographerId = photographerId !== undefined ? photographerId : req.body.photographer_id;

        if (photographerIds !== undefined && photographerIds.length > 0) {
          updateData.photographerIds = photographerIds;
          updateData.photographer_id = null;
          updateData.bookingStatus = "pending";
          updateData.status = "pending";
        }

        if (finalPhotographerId !== undefined) {
          updateData.photographer_id = finalPhotographerId;
          if (finalPhotographerId) {
            updateData.photographerIds = [];
            updateData.bookingStatus = "accepted";
            updateData.status = "confirmed";
            updateData.acceptedAt = new Date();
            isDirectAssign = true;
          } else {
            updateData.bookingStatus = "pending";
            updateData.status = "pending";
          }
        }
      }

      // Calculate Photographer Amount if direct assigned
      if (isDirectAssign && (updateData.photographer_id || updateData.photographerIds?.length > 0)) {
        const primaryId = updateData.photographer_id || updateData.photographerIds[0];
        const [photographer, settings] = await Promise.all([
          Photographer.findById(primaryId),
          PlatformSettings.findOne({ type: "commissions" })
        ]);

        if (photographer) {
          const global = settings || { initio: 0, elite: 0, pro: 0 };
          const level = photographer.professionalDetails?.expertiseLevel || "INITIO";
          let commission = photographer.commissionPercentage;
          if (!commission) {
            if (level === "INITIO") commission = global.initio;
            else if (level === "ELITE") commission = global.elite;
            else if (level === "PRO") commission = global.pro;
          }
          updateData.photographerAmount = Math.round(booking.totalAmount * (1 - (commission || 0) / 100));
        }
      }

      const updatedBooking = await ServiceBooking.findByIdAndUpdate(
        finalBookingId,
        updateData,
        { new: true }
      ).populate("service_id photographer_id");

      // ─── Send Notifications (non-blocking) ────────────────────────────────
      const bookingRef = updatedBooking.veroaBookingId || updatedBooking._id.toString();
      const eventName = updatedBooking.service_id?.serviceName || "your booking";
      const isHourly = updatedBooking.serviceCategory === "hourly";
      const hoursValue = isHourly 
        ? (updatedBooking.hourlyPackages?.[0]?.subCategoryName || updatedBooking.hours || updatedBooking.hourlyPackages?.[0]?.hours || "")
        : (updatedBooking.hours || "");
      const hoursInfo = hoursValue ? ` for ${hoursValue}${typeof hoursValue === 'number' ? ' hours' : ''}` : "";

      // Case 1: Direct assignment (Accepted)
      if (updatedBooking.bookingStatus === "accepted") {
        const targetIds = updatedBooking.photographer_id ? [updatedBooking.photographer_id] : (updatedBooking.photographerIds || []);
        targetIds.forEach(pid => {
          (async () => {
            try {
              await Notification.create({
                photographer_id: new mongoose.Types.ObjectId(pid.toString()),
                notification_type: "booking_assigned",
                notification_message: `New booking ${bookingRef} (${eventName})${hoursInfo} has been assigned to you.`,
                booking_id: updatedBooking._id,
                screen: "BookingScreen"
              });
              emitNotificationCount(pid.toString());

              const photographer = await Photographer.findById(pid).select("fcmToken basicInfo.fullName pushNotification");
              if (photographer?.fcmToken && photographer.pushNotification !== false) {
                const message = {
                  notification: {
                    title: "New Booking Assigned!",
                    body: `You have been assigned to booking ${bookingRef} (${eventName})${hoursInfo}.`,
                  },
                  token: photographer.fcmToken,
                  data: { bookingId: updatedBooking._id.toString(), type: "booking_assigned", screen: "BookingScreen" },
                  android: { priority: "high", notification: { channelId: "veroa_updates" } }
                };
                await admin.messaging().send(message);
              }
            } catch (err) { console.error("[Notification] Direct assignment error:", err.message); }
          })();
        });
      }

      // Case 2: Invitation (Pending)
      if (updatedBooking.bookingStatus === "pending" && updatedBooking.photographerIds?.length > 0) {
        updatedBooking.photographerIds.forEach(pid => {
          (async () => {
            try {
              await Notification.create({
                photographer_id: new mongoose.Types.ObjectId(pid.toString()),
                notification_type: "booking_invite",
                notification_message: `New booking invitation ${bookingRef} (${eventName})${hoursInfo} received.`,
                booking_id: updatedBooking._id,
                screen: "BookingScreen"
              });
              emitNotificationCount(pid.toString());

              const photographer = await Photographer.findById(pid).select("fcmToken basicInfo.fullName pushNotification");
              if (photographer?.fcmToken && photographer.pushNotification !== false) {
                const message = {
                  notification: {
                    title: "New Booking Invitation",
                    body: `New booking invitation ${bookingRef} (${eventName})${hoursInfo} received.`,
                  },
                  token: photographer.fcmToken,
                  data: { bookingId: updatedBooking._id.toString(), type: "booking_invite", screen: "BookingScreen" },
                  android: { priority: "high", notification: { channelId: "veroa_updates" } }
                };
                await admin.messaging().send(message);
              }
            } catch (err) { console.error("[Notification] Invitation error:", err.message); }
          })();
        });
      }

      // ─────────────────────────────────────────────────────────────────────

      // ─── Create or Update Payout Summary ───────────────────────────────
      if (updatedBooking.photographer_id || updatedBooking.photographerIds?.length > 0) {
        try {
          const primaryId = updatedBooking.photographer_id || updatedBooking.photographerIds[0];
          await Payout.findOneAndUpdate(
            { booking_id: updatedBooking._id },
            {
              photographer_id: primaryId,
              total_amount: updatedBooking.totalAmount,
              shootType: updatedBooking.serviceCategory === "editing" ? "PhotoEditing" : (updatedBooking.serviceCategory === "hourly" ? "HourlyShoot" : "Service"),
              status: "Pending",
            },
            { upsert: true, new: true }
          );
        } catch (payoutErr) {
          console.error("[Payout] Error syncing payout on assignment:", payoutErr.message);
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      return res.json({
        success: true,
        message: updatedBooking.bookingStatus === "accepted" ? "Photographers assigned directly" : "Photographers invited successfully",
        data: updatedBooking
      });
    } catch (err) {
      return next(err);
    }
  }

  async getCompletedBookings(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const filter = {
        $or: [
          { paymentStatus: "fully paid" },
          { paymentStatus: "paid" }
        ]
      };

      const [items, total] = await Promise.all([
        ServiceBooking.find(filter)
          .skip(skip)
          .limit(limit)
          .sort({ bookingDate: -1 })
          .populate("service_id client_id photographer_id"),
        ServiceBooking.countDocuments(filter),
      ]);

      return res.json({
        success: true,
        data: items,
        meta: { total, page, limit },
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get gallery by booking ID (Admin)
   * GET /api/admins/bookings/:id/gallery
   */
  async getGalleryByBookingId(req, res, next) {
    try {
      let { id } = req.params;

      // Resolve database _id if veroaBookingId is provided
      if (!mongoose.Types.ObjectId.isValid(id)) {
        const found = await ServiceBooking.findOne({ veroaBookingId: id }).select("_id");
        if (found) id = found._id;
      }

      const gallery = await Gallery.findOne({ booking_id: id });

      if (!gallery) {
        return res.status(404).json({
          success: false,
          message: "Gallery not found for this booking",
        });
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const galleryData = gallery.toObject();

      galleryData.gallery = galleryData.gallery.map(path =>
        path.startsWith("http") ? path : `${baseUrl}/${path.replace(/\\/g, "/").replace(/^\//, "")}`
      );

      return res.json({
        success: true,
        data: galleryData,
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get brief summary of all services booked by a customer
   * GET /api/admin/customers/:clientId/booked-services
   */
  async getCustomerServicesSummary(req, res, next) {
    try {
      const { clientId } = req.params;

      const bookings = await ServiceBooking.find({ client_id: clientId })
        .populate("service_id", "serviceName serviceDescription")
        .sort({ createdAt: -1 });

      const summary = bookings.map((booking) => ({
        serviceName: booking.service_id?.serviceName || "",
        cost: booking.totalAmount,
        description: booking.service_id?.serviceDescription || "",
        bookingDate: booking.bookingDate,
        status: booking.status,
      }));

      return res.json({
        success: true,
        data: summary,
      });
    } catch (err) {
      return next(err);
    }
  }
  async getServiceBookingsWithChatCount(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const [items, total, allUnreadCountData] = await Promise.all([
        ServiceBooking.aggregate([
          {
            $lookup: {
              from: "conversations",
              localField: "_id",
              foreignField: "bookingId",
              as: "conversation",
            },
          },
          { $addFields: { conversation: { $arrayElemAt: ["$conversation", 0] } } },
          {
            $lookup: {
              from: "messages",
              localField: "conversation._id",
              foreignField: "conversationId",
              as: "allMessages",
            },
          },
          {
            $lookup: {
              from: "messages",
              let: { convId: "$conversation._id" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$conversationId", "$$convId"] },
                    isAdminRead: false,
                  },
                },
              ],
              as: "unreadMessages",
            },
          },
          {
            $addFields: {
              messageCount: { $size: "$allMessages" },
              unreadCount: { $size: "$unreadMessages" },
            },
          },
          {
            $lookup: {
              from: "services",
              localField: "service_id",
              foreignField: "_id",
              as: "service_id",
            },
          },
          { $addFields: { service_id: { $arrayElemAt: ["$service_id", 0] } } },
          {
            $lookup: {
              from: "users",
              localField: "client_id",
              foreignField: "_id",
              as: "client_id",
            },
          },
          { $addFields: { client_id: { $arrayElemAt: ["$client_id", 0] } } },
          {
            $lookup: {
              from: "photographers",
              localField: "photographer_id",
              foreignField: "_id",
              as: "photographer_id",
            },
          },
          { $addFields: { photographer_id: { $arrayElemAt: ["$photographer_id", 0] } } },
          { $sort: { unreadCount: -1, "conversation.lastMessageAt": -1, createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              id: "$_id",
              "bookingId": "$veroaBookingId",
              "clientName": "$client_id.username",
              "eventType": "$service_id.serviceName",
              "eventDate": "$bookingDate",
              "eventLocation": {
                $concat: [
                  { $ifNull: ["$flatOrHouseNo", ""] }, ", ",
                  { $ifNull: ["$streetName", ""] }, ", ",
                  { $ifNull: ["$city", ""] }, ", ",
                  { $ifNull: ["$state", ""] }, " - ",
                  { $ifNull: ["$postalCode", ""] }
                ]
              },
              "bookingAmount": "$totalAmount",
              "totalAmount": "$totalAmount",
              "photographerAmount": { $ifNull: ["$photographerAmount", 0] },
              "paymentMode": "$paymentMode",
              "bookingStatus": "$status",
              "paymentStatus": "$paymentStatus",
              "galleryStatus": { $ifNull: ["$galleryStatus", "Upload Pending"] },
              "assignPhotographer": "$photographer_id.basicInfo.fullName",
              "team_studio": {
                $cond: {
                  if: { $gt: [{ $type: "$photographer_id" }, "missing"] },
                  then: { $ifNull: ["$photographer_id.professionalDetails.team_studio", ""] },
                  else: "$team"
                }
              },
              "unreadmessages": "$unreadCount",
            },
          },
        ]),
        ServiceBooking.countDocuments(),
        // Total Unread Bookings Count (Unique bookings with unread messages)
        Message.aggregate([
          { $match: { isAdminRead: false } },
          {
            $lookup: {
              from: "conversations",
              localField: "conversationId",
              foreignField: "_id",
              as: "conversation"
            }
          },
          { $unwind: "$conversation" },
          { $match: { "conversation.bookingId": { $ne: null } } },
          {
            $lookup: {
              from: "servicebookings",
              localField: "conversation.bookingId",
              foreignField: "_id",
              as: "booking"
            }
          },
          { $match: { "booking.0": { $exists: true } } },
          { $count: "count" }
        ])
      ]);

      const allUnreadCount = allUnreadCountData[0]?.count || 0;

      return res.json({
        success: true,
        allunreadcount: allUnreadCount,
        data: items,
        meta: { total, page, limit },
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Get all hourly bookings
   * GET /api/admins/hourly-bookings
   */
  async getHourlyBookings(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const type = req.query.type || "";
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split("T")[0];

      let filter = {
        $or: [
          { serviceCategory: "hourly" },
          { eventType: { $regex: /photography|shoot/i } },
          { shootType: { $regex: /photography|shoot/i } }
        ]
      };

      if (type === "upcoming") {
        filter.$and = [
          {
            $or: [
              { endDate: { $exists: true, $ne: null, $ne: "", $gte: todayStr } },
              {
                $and: [
                  { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: "" }] },
                  { startDate: { $exists: true, $ne: null, $ne: "", $gte: todayStr } }
                ]
              },
              {
                $and: [
                  { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: "" }] },
                  { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: "" }] },
                  { date: { $exists: true, $ne: null, $ne: "", $gte: todayStr } }
                ]
              }
            ]
          }
        ];
      } else if (type === "previous") {
        filter.$and = [
          {
            $or: [
              { endDate: { $exists: true, $ne: null, $ne: "", $lt: todayStr } },
              {
                $and: [
                  { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: "" }] },
                  { startDate: { $exists: true, $ne: null, $ne: "", $lt: todayStr } }
                ]
              },
              {
                $and: [
                  { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: "" }] },
                  { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: "" }] },
                  { date: { $exists: true, $ne: null, $ne: "", $lt: todayStr } }
                ]
              }
            ]
          }
        ];
      }
      const [items, total] = await Promise.all([
        ServiceBooking.find(filter)
          .populate("client_id", "username mobileNumber email")
          .populate("photographer_id", "basicInfo.fullName professionalDetails")
          .populate("cartId")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ServiceBooking.countDocuments(filter)
      ]);

      // Force onModel to match category for existing records so population works
      for (const booking of items) {
        if (booking.cartId && booking.cartId.items) {
          for (const item of booking.cartId.items) {
            let planModel = PhotographyPlan;
            if (item.category === "editing") planModel = EditingPlan;
            else if (item.category === "shoot_team") planModel = TeamShootPlan;
            else if (item.category === "package") planModel = Package;
            else if (item.category === "service") planModel = Service;
            else if (item.category === "hourly") planModel = HourlyShootService;

            if (item.planId) {
              const planData = await planModel.findById(item.planId).lean();
              if (planData) {
                item.planId = planData;
              }
            }
          }
        }
      }

      // Group bookings by cartId or veroaBookingId to avoid duplicates in the UI
      const groupedMap = new Map();

      // 1. Pre-fetch names for ALL assigned staff across ALL bookings for performance
      const allAssignedIdsAcrossBookings = new Set();
      items.forEach(booking => {
        // Helper to safely add IDs from raw or populated fields
        const addId = (val) => {
          if (!val) return;
          const id = val._id || val;
          if (id && typeof id.toString === 'function') {
            const str = id.toString();
            if (str && str !== '[object Object]') allAssignedIdsAcrossBookings.add(str);
          }
        };

        // Top-level staff
        addId(booking.photographer_id);
        if (booking.photographerIds) booking.photographerIds.forEach(id => addId(id));
        
        // Plan-wise staff
        if (booking.hourlyPackages) {
          booking.hourlyPackages.forEach(p => {
            (p.assignedPhotographers || []).forEach(id => addId(id));
            (p.assignedVideographers || []).forEach(id => addId(id));
            (p.assignedEditors || []).forEach(id => addId(id));
            (p.assignedLighting || []).forEach(id => addId(id));
          });
        }
      });

      const globalNamesMap = {};
      if (allAssignedIdsAcrossBookings.size > 0) {
        const photographers = await Photographer.find(
          { _id: { $in: Array.from(allAssignedIdsAcrossBookings) } },
          "basicInfo.fullName"
        ).lean();
        photographers.forEach(p => {
          globalNamesMap[p._id.toString()] = p.basicInfo?.fullName || "Unknown";
        });
      }

      items.forEach(booking => {
        // Use cart ID as the primary key for grouping if it exists, fallback to veroaBookingId
        const groupKey = booking.cartId?._id?.toString() || booking.veroaBookingId || booking._id.toString();

        const addressParts = [
          booking.flatOrHouseNo,
          booking.streetName,
          booking.city,
          booking.state
        ].filter(Boolean);

        const eventAddress = addressParts.join(", ") + (booking.postalCode ? ` - ${booking.postalCode}` : "");
        const eDate = booking.date || "N/A";
        const eTime = booking.time || "N/A";

        const packagesMap = {};

        // 1. Try to use hourlyPackages from the booking itself (New structure)
        if (booking.hourlyPackages && booking.hourlyPackages.length > 0) {
          booking.hourlyPackages.forEach((pkg, idx) => {
            const cat = pkg.category ? (pkg.category.charAt(0).toUpperCase() + pkg.category.slice(1)) : "Standard";
            const duration = pkg.subCategoryName || pkg.hours || (booking.hours ? `${booking.hours} Hours` : "N/A");
            const key = `pkg-${idx}`;
            const services = pkg.services || [
              { name: pkg.planName || "Hourly Plan", qty: 1, price: pkg.price || 0 }
            ];
            const subTotal = services.reduce((sum, s) => sum + (s.price || 0), 0);
            packagesMap[key] = {
              hours: duration,
              category: cat,
              services: services,
              subTotal: subTotal,
              assignedPhotographers: pkg.assignedPhotographers || [],
              assignedVideographers: pkg.assignedVideographers || [],
              assignedEditors: pkg.assignedEditors || [],
              assignedLighting: pkg.assignedLighting || []
            };
          });
        }
        // 2. Fallback to cart items (Old structure)
        else if (booking.cartId && booking.cartId.items) {
          booking.cartId.items.forEach(item => {
            let duration = "N/A";
            const match = item.name.match(/\((.*?)\)/);
            if (match) duration = match[1];
            else if (booking.hours) duration = `${booking.hours} Hours`;

            const cat = item.subCategoryType ? (item.subCategoryType.charAt(0).toUpperCase() + item.subCategoryType.slice(1)) : "Standard";
            const key = `${duration}-${cat}`;
            if (!packagesMap[key]) {
              packagesMap[key] = { hours: duration, category: cat, services: [] };
            }
            const cleanName = item.name.split(" (")[0].trim();
            packagesMap[key].services.push({
              name: cleanName,
              qty: item.quantity,
              price: item.price * item.quantity
            });
          });

          // Calculate subTotal for each package in fallback structure
          Object.values(packagesMap).forEach(pkg => {
            pkg.subTotal = pkg.services.reduce((sum, s) => sum + (s.price || 0), 0);
          });
        }

        let hourlyPackages = Object.values(packagesMap);

        // Map pre-fetched names to each package
        hourlyPackages.forEach(p => {
          p.assignedPhotographerNames = (p.assignedPhotographers || []).map(id => globalNamesMap[id.toString()] || "Unknown");
          p.assignedVideographerNames = (p.assignedVideographers || []).map(id => globalNamesMap[id.toString()] || "Unknown");
          p.assignedEditorNames = (p.assignedEditors || []).map(id => globalNamesMap[id.toString()] || "Unknown");
          p.assignedLightingNames = (p.assignedLighting || []).map(id => globalNamesMap[id.toString()] || "Unknown");
        });


        if (hourlyPackages.length === 0) {
          hourlyPackages = [{
            hours: booking.hours ? `${booking.hours} Hours` : "N/A",
            category: booking.subCategoryType ? (booking.subCategoryType.charAt(0).toUpperCase() + booking.subCategoryType.slice(1)) : "Standard",
            services: [],
            price: booking.totalAmount || 0,
            eventDate: eDate,
            eventTime: eTime,
            subTotal: booking.totalAmount || 0
          }];
        }

        const formatted = {
          bookingId: booking.veroaBookingId || booking._id,
          client_id: booking.client_id?._id || null,
          clientName: booking.client_id?.username || "Unknown",
          eventAddress: eventAddress || booking.address || "N/A",
          photographer_id: booking.photographer_id?._id || null,
          assignedPhotographer: (() => {
            const primary = booking.photographer_id?.basicInfo?.fullName;
            if (primary) return primary;
            // Collect all unique names across all package roles
            const allNames = new Set();
            hourlyPackages.forEach(p => {
              (p.assignedPhotographerNames || []).forEach(n => allNames.add(n));
              (p.assignedVideographerNames || []).forEach(n => allNames.add(n));
              (p.assignedEditorNames || []).forEach(n => allNames.add(n));
              (p.assignedLightingNames || []).forEach(n => allNames.add(n));
            });
            return Array.from(allNames).join(", ") || "";
          })(),
          galleryUpload: booking.galleryStatus === "Photos Uploaded",
          galleryStatus: booking.galleryStatus || "pending",
          bookingStatus: booking.status || "pending",
          hourlyPackages: hourlyPackages,
          subTotal: booking.totalAmount || 0,
          totalAmount: booking.totalAmount || 0,
          media: booking.media || [],
          cart: booking.cartId || null
        };

        if (!groupedMap.has(groupKey)) {
          // Store the original createdAt for sorting later
          formatted._createdAt = booking.createdAt;
          groupedMap.set(groupKey, formatted);
        } else {
          // If duplicate cart/booking, merge packages if they are different
          const existing = groupedMap.get(groupKey);
          hourlyPackages.forEach(pkg => {
            const hasPkg = existing.hourlyPackages.some(p => p.hours === pkg.hours && p.category === pkg.category);
            if (!hasPkg) existing.hourlyPackages.push(pkg);
          });
          // Use the more specific address if available
          if (existing.eventAddress === "N/A" && formatted.eventAddress !== "N/A") {
            existing.eventAddress = formatted.eventAddress;
          }
          // Use the more specific booking ID
          if (formatted.bookingId > existing.bookingId) {
            existing.bookingId = formatted.bookingId;
          }
          // Keep the newest createdAt
          if (booking.createdAt > existing._createdAt) {
            existing._createdAt = booking.createdAt;
          }
        }
      });

      // Convert Map to array and sort by _createdAt descending (newest first)
      const finalBookings = await Promise.all(Array.from(groupedMap.values())
        .sort((a, b) => new Date(b._createdAt || 0) - new Date(a._createdAt || 0))
        .map(async b => {
          const mediaKeys = (b.media || []).filter(m => m && !m.startsWith("http"));
          const mediaUrls = (b.media || []).filter(m => m && m.startsWith("http"));

          const signedView = mediaKeys.length > 0 ? await s3Service.getBatchSignedUrls(mediaKeys, 36000, 'inline') : [];
          const signedDownload = mediaKeys.length > 0 ? await s3Service.getBatchSignedUrls(mediaKeys, 36000, 'attachment') : [];

          return {
            ...b,
            media: [...mediaUrls, ...signedView],
            downloadMedia: [...mediaUrls, ...signedDownload]
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: finalBookings,
        meta: { total: total, page, limit }
      });
    } catch (error) {
      console.error("Error in getHourlyBookings:", error);
      next(error);
    }
  }

  /**
   * Get all editing bookings
   * GET /api/admins/editing-bookings
   */
  async getEditingBookings(req, res, next) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const skip = (page - 1) * limit;

      const type = req.query.type || "";
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split("T")[0];

      let filter = {
        $or: [
          { editingPackages: { $exists: true, $not: { $size: 0 } } },
          { editingbookings: { $exists: true, $not: { $size: 0 } } },
          { serviceCategory: "editing" },
          { eventType: "Editing" },
          { shootType: "Editing" },
          { media: { $elemMatch: { $regex: /editing/i } } }
        ]
      };

      if (type === "upcoming") {
        filter.$and = [
          {
            $or: [
              { endDate: { $exists: true, $ne: null, $ne: "", $gte: todayStr } },
              {
                $and: [
                  { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: "" }] },
                  { startDate: { $exists: true, $ne: null, $ne: "", $gte: todayStr } }
                ]
              },
              {
                $and: [
                  { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: "" }] },
                  { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: "" }] },
                  { date: { $exists: true, $ne: null, $ne: "", $gte: todayStr } }
                ]
              }
            ]
          }
        ];
      } else if (type === "previous") {
        filter.$and = [
          {
            $or: [
              { endDate: { $exists: true, $ne: null, $ne: "", $lt: todayStr } },
              {
                $and: [
                  { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: "" }] },
                  { startDate: { $exists: true, $ne: null, $ne: "", $lt: todayStr } }
                ]
              },
              {
                $and: [
                  { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: "" }] },
                  { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: "" }] },
                  { date: { $exists: true, $ne: null, $ne: "", $lt: todayStr } }
                ]
              }
            ]
          }
        ];
      }

      const [items, total] = await Promise.all([
        ServiceBooking.find(filter)
          .populate("client_id", "username")
          .populate("photographer_id", "basicInfo.fullName")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ServiceBooking.countDocuments({
          $or: [
            { editingPackages: { $exists: true, $not: { $size: 0 } } },
            { editingbookings: { $exists: true, $not: { $size: 0 } } },
            { serviceCategory: "editing" },
            { eventType: "Editing" },
            { shootType: "Editing" },
            { media: { $elemMatch: { $regex: /editing/i } } }
          ]
        })
      ]);

      // Manual population of EditingPlan details
      for (const booking of items) {
        const rawPkgs = booking.editingPackages || booking.editingbookings;
        if (rawPkgs && rawPkgs.length > 0) {
          for (const pkg of rawPkgs) {
            if (pkg.planId && !pkg.numberOfVideos) {
              const plan = await EditingPlan.findById(pkg.planId).lean();
              if (plan) {
                Object.assign(pkg, plan);
              }
            }
          }
        }
      }

      // Fetch data links for these bookings
      const bookingVeroaIds = items.map(b => b.veroaBookingId).filter(Boolean);
      const allLinks = await DataLinks.find({ veroaBookingId: { $in: bookingVeroaIds } }).lean();

      const linksMap = allLinks.reduce((acc, link) => {
        if (!acc[link.veroaBookingId]) acc[link.veroaBookingId] = [];
        acc[link.veroaBookingId].push(link.dataLink);
        return acc;
      }, {});

      const formattedBookings = await Promise.all(items.map(async booking => {
        const addressParts = [
          booking.flatOrHouseNo,
          booking.streetName,
          booking.city,
          booking.state
        ].filter(Boolean);

        const eventAddress = addressParts.join(", ") + (booking.postalCode ? ` - ${booking.postalCode}` : "");

        let rawPkgs = booking.editingPackages || booking.editingbookings || [];

        // If we have video counts but no explicit package array, generate them
        if ((!Array.isArray(rawPkgs) || rawPkgs.length === 0)) {
          if (booking.standardEditingVideos > 0) {
            rawPkgs.push({
              planName: "Standard Editing",
              price: booking.standardEditingPrice || 0,
              numberOfVideos: booking.standardEditingVideos,
              planCategory: "Standard",
              _id: "std-fallback"
            });
          }
          if (booking.premiumEditingVideos > 0) {
            rawPkgs.push({
              planName: "Premium Editing",
              price: booking.premiumEditingPrice || 0,
              numberOfVideos: booking.premiumEditingVideos,
              planCategory: "Premium",
              _id: "prem-fallback"
            });
          }
        }

        // Final fallback if still empty
        if (rawPkgs.length === 0) {
          rawPkgs = [{
            planName: "General Editing",
            price: booking.totalAmount || 0,
            numberOfVideos: booking.media?.length || 1,
            planCategory: "Standard",
            _id: "fallback"
          }];
        }

        const videoPackages = await Promise.all(rawPkgs.map(async pkg => {
          const bookingLinks = linksMap[booking.veroaBookingId] || [];

          // Separate keys from full URLs in the media array
          const mediaKeys = (booking.media || []).filter(m => m && !m.startsWith("http"));
          const mediaUrls = (booking.media || []).filter(m => m && m.startsWith("http"));

          // Generate signed URLs for keys
          const signedViewUrls = mediaKeys.length > 0
            ? await s3Service.getBatchSignedUrls(mediaKeys, 36000, 'inline')
            : [];

          const signedDownloadUrls = mediaKeys.length > 0
            ? await s3Service.getBatchSignedUrls(mediaKeys, 36000, 'attachment')
            : [];

          const combinedViewMedia = [...mediaUrls, ...signedViewUrls, ...bookingLinks];
          const combinedDownloadMedia = [...mediaUrls, ...signedDownloadUrls, ...bookingLinks];

          let vCount = Math.max(parseInt(pkg.numberOfVideos) || 0, combinedViewMedia.length) || 1;

          // Generate videos list as expected by UI
          const videos = Array.from({ length: vCount }, (_, i) => ({
            videoId: `${pkg._id || pkg.planId || 'pkg'}-v${i + 1}`,
            videoNumber: i + 1,
            viewUrl: combinedViewMedia[i] || "",
            downloadUrl: combinedDownloadMedia[i] || ""
          }));

          return {
            packageId: booking.veroaBookingId || booking._id,
            type: pkg.planCategory || pkg.category || (pkg.planName?.toLowerCase().includes("premium") ? "Premium" : "Standard"),
            price: parseFloat(pkg.price) || 0,
            videosCount: parseInt(pkg.numberOfVideos) || vCount,
            videos: videos,
            planName: pkg.planName || "Editing Plan"
          };
        }));

        const calculatedTotal = rawPkgs.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0);

        return {
          bookingId: booking.veroaBookingId || booking._id,
          client_id: booking.client_id?._id || null,
          clientName: booking.client_id?.username || "Unknown",
          eventAddress: eventAddress || "N/A",
          photographer_id: booking.photographer_id?._id || null,
          assignedPhotographer: booking.photographer_id?.basicInfo?.fullName || "",
          galleryStatus: booking.galleryStatus || "pending",
          bookingStatus: booking.status || "pending",
          videoPackages: videoPackages,
          totalAmount: booking.totalAmount || calculatedTotal || 0,
          eventType: booking.service_id?.serviceName || booking.eventType || "Editing",
          location: booking.location || eventAddress || "N/A",
          startDate: booking.startDate || booking.date || booking.eventDate,
          endDate: booking.endDate || booking.startDate || booking.date || booking.eventDate,
          address: eventAddress,
          media: await (async () => {
            const keys = (booking.media || []).filter(m => m && !m.startsWith("http"));
            const urls = (booking.media || []).filter(m => m && m.startsWith("http"));
            const signed = keys.length > 0 ? await s3Service.getBatchSignedUrls(keys, 36000) : [];
            return [...urls, ...signed];
          })(),
          createdAt: booking.createdAt,
          standardEditingVideos: booking.standardEditingVideos || 0,
          premiumEditingVideos: booking.premiumEditingVideos || 0,
          totalEditingVideos: booking.totalEditingVideos || 0
        };
      }));

      // Sort final formatted list by createdAt descending (newest first)
      const finalBookings = formattedBookings.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      return res.status(200).json({
        success: true,
        data: finalBookings,
        meta: { total, page, limit }
      });
    } catch (error) {
      next(error);
    }
  }

  async getHourlyAndEditingBookingDetails(req, res) {

    const { veroaBookingId } = req.params;

    try {
      const booking = await ServiceBooking.findOne({ veroaBookingId: veroaBookingId }).select('cartId');
      console.log("Booking veroa", booking)
      if (!booking) {
        return res.status(404).json({ success: false, message: "Items not found" });
      }

      const cart = await Cart.findOne({ _id: booking.cartId }).select('items');
      console.log("cart", cart)
      if (!cart) {
        return res.status(404).json({ success: false, message: "Items not found" });
      }
      return res.status(200).json({ success: true, data: booking });
    } catch (error) {

    }
  }
}

export default new ServiceBookingController();