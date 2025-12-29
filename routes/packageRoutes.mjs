import express from "express";
import PackageController from "../controllers/PackageController.mjs";

const router = express.Router();

router.post("/", PackageController.create);
router.get("/", PackageController.getAll);
router.get("/:id", PackageController.getOne);
router.put("/:id", PackageController.update);
router.delete("/:id", PackageController.delete);

export default router;
