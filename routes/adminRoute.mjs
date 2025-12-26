import express from "express";
import AdminController from "../controllers/AdminController.mjs";
const router = express.Router();

router.post("/", (req, res, next) => AdminController.create(req, res, next));
router.get("/", (req, res, next) => AdminController.list(req, res, next));

router.get("/:id", (req, res, next) => AdminController.getById(req, res, next));
router.put("/:id", (req, res, next) => AdminController.update(req, res, next));
router.delete("/:id", (req, res, next) =>
  AdminController.delete(req, res, next)
);

export default router;
