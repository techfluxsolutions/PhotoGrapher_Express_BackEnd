// //import StandardAndPremium from "../../models/StandardAndPremium.mjs";
// import fs from "fs";
// import path from "path";

// class StandardAndPremiumController {
//     /**
//      * Create a new package
//      * POST /api/admins/standard-premium
//      */
//     async createPackage(req, res, next) {
//         try {
//             const payload = req.body;

//             // Handle file uploads
//             if (req.files && req.files.length > 0) {
//                 payload.images = req.files.map(file => `/uploads/serviceImages/${file.filename}`);
//             }

//             // Parse hourSection if it comes as a string (from multipart/form-data)
//             if (typeof payload.hourSection === 'string') {
//                 payload.hourSection = JSON.parse(payload.hourSection);
//             }
//             if (typeof payload.features === 'string') {
//                 payload.features = JSON.parse(payload.features);
//             }

//             const packageObj = await StandardAndPremium.create(payload);

//             return res.status(201).json({
//                 success: true,
//                 data: packageObj
//             });
//         } catch (err) {
//             return next(err);
//         }
//     }

//     /**
//      * Get all packages
//      * GET /api/admins/standard-premium
//      */
//     async getAllPackages(req, res, next) {
//         try {
//             const packages = await StandardAndPremium.find().sort({ createdAt: -1 });
//             return res.json({
//                 success: true,
//                 data: packages
//             });
//         } catch (err) {
//             return next(err);
//         }
//     }

//     /**
//      * Get package by ID
//      * GET /api/admins/standard-premium/:id
//      */
//     async getPackageById(req, res, next) {
//         try {
//             const packageObj = await StandardAndPremium.findById(req.params.id);
//             if (!packageObj) {
//                 return res.status(404).json({
//                     success: false,
//                     message: "Package not found"
//                 });
//             }
//             return res.json({
//                 success: true,
//                 data: packageObj
//             });
//         } catch (err) {
//             return next(err);
//         }
//     }

//     /**
//      * Update package by ID
//      * PUT /api/admins/standard-premium/:id
//      */
//     async updatePackage(req, res, next) {
//         try {
//             const { id } = req.params;
//             const payload = req.body;

//             const existingPackage = await StandardAndPremium.findById(id);
//             if (!existingPackage) {
//                 return res.status(404).json({
//                     success: false,
//                     message: "Package not found"
//                 });
//             }

//             // Handle new image uploads
//             if (req.files && req.files.length > 0) {
//                 // Delete old images from disk
//                 if (existingPackage.images && existingPackage.images.length > 0) {
//                     existingPackage.images.forEach(img => {
//                         const fileName = img.split('/').pop();
//                         const fullPath = path.resolve(process.cwd(), "uploads/serviceImages", fileName);
//                         if (fs.existsSync(fullPath)) {
//                             fs.unlinkSync(fullPath);
//                         }
//                     });
//                 }
//                 payload.images = req.files.map(file => `/uploads/serviceImages/${file.filename}`);
//             }

//             // Parse JSON strings from multipart/form-data
//             if (typeof payload.hourSection === 'string') {
//                 payload.hourSection = JSON.parse(payload.hourSection);
//             }
//             if (typeof payload.features === 'string') {
//                 payload.features = JSON.parse(payload.features);
//             }

//             const updatedPackage = await StandardAndPremium.findByIdAndUpdate(id, payload, {
//                 new: true,
//                 runValidators: true,
//             });

//             return res.json({
//                 success: true,
//                 data: updatedPackage
//             });
//         } catch (err) {
//             return next(err);
//         }
//     }

//     /**
//      * Delete package by ID
//      * DELETE /api/admins/standard-premium/:id
//      */
//     async deletePackage(req, res, next) {
//         try {
//             const { id } = req.params;

//             const packageObj = await StandardAndPremium.findById(id);
//             if (!packageObj) {
//                 return res.status(404).json({
//                     success: false,
//                     message: "Package not found"
//                 });
//             }

//             // Delete images from disk
//             if (packageObj.images && packageObj.images.length > 0) {
//                 packageObj.images.forEach(img => {
//                     const fileName = img.split('/').pop();
//                     const fullPath = path.resolve(process.cwd(), "uploads/serviceImages", fileName);
//                     if (fs.existsSync(fullPath)) {
//                         fs.unlinkSync(fullPath);
//                     }
//                 });
//             }

//             await StandardAndPremium.findByIdAndDelete(id);

//             return res.json({
//                 success: true,
//                 message: "Package and associated images deleted successfully"
//             });
//         } catch (err) {
//             return next(err);
//         }
//     }
// }

// export default new StandardAndPremiumController();
