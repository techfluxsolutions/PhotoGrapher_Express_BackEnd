// routes/otherPackagesRoutes.js
import express from "express";
import OtherPackagesService from "../controllers/OtherPackageController.mjs";

const router = express.Router();

router.post("/create", OtherPackagesService.createPackage);           // Create
router.get("/getAllServices", OtherPackagesService.getAllPackages);          // Read all
router.get("/getPackageById/:id", OtherPackagesService.getPackageById);       // Read by ID
router.put("/updatePackage/:id", OtherPackagesService.updatePackage);        // Update
router.delete("/deletePackage/:id", OtherPackagesService.deletePackage);     // Delete

export default router;