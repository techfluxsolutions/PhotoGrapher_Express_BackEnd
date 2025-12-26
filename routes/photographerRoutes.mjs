import express from "express";
import PhotographerController from "../controllers/PhotographerController.mjs";

const router = express.Router();

router.post("/", (req, res, next) => PhotographerController.create(req, res, next));
router.get("/", (req, res, next) => PhotographerController.list(req, res, next));

router.get("/:id", (req, res, next) => PhotographerController.getById(req, res, next));
router.put("/:id", (req, res, next) => PhotographerController.update(req, res, next));
router.delete("/:id", (req, res, next) => PhotographerController.delete(req, res, next));

export default router;
