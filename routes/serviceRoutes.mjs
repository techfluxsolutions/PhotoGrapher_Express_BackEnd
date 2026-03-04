import express from "express";
import StandardAndPremiumController from "../controllers/Admin/StandardAndPremiumController.mjs";
import HourlyServicesController from "../controllers/Admin/HourlyServicesController.mjs";
import serviceUpload from "../middleware/serviceUpload.mjs";

const router = express.Router();

// Standard And Premium Routes
router.post(
  "/standard-premium",
  serviceUpload.array("images", 10),
  StandardAndPremiumController.createPackage
);
router.get("/standard-premium", StandardAndPremiumController.getAllPackages);
router.get("/standard-premium/:id", StandardAndPremiumController.getPackageById);
router.put(
  "/standard-premium/:id",
  serviceUpload.array("images", 10),
  StandardAndPremiumController.updatePackage
);
router.delete("/standard-premium/:id", StandardAndPremiumController.deletePackage);

// Hourly Services Routes
router.post(
  "/hourly-services",
  serviceUpload.array("images", 10),
  HourlyServicesController.createService
);
router.get("/hourly-services", HourlyServicesController.getAllServices);
router.get("/hourly-services/:id", HourlyServicesController.getServiceById);
router.put(
  "/hourly-services/:id",
  serviceUpload.array("images", 10),
  HourlyServicesController.updateService
);
router.delete("/hourly-services/:id", HourlyServicesController.deleteService);

export default router;
