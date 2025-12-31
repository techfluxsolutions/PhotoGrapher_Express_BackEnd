import express from "express";
const router = express.Router();
import UserController from "../controllers/UserController.mjs";

// Collection routes
router.post("/", (req, res, next) =>
  UserController.create(req, res, next)
);
router.get("/", (req, res, next) => UserController.list(req, res, next));

import upload from "../middleware/multerConfig.mjs";

// Item routes
router.get("/:id", (req, res, next) => UserController.getById(req, res, next));
router.put("/:id", upload.single('avatar'), (req, res, next) => UserController.update(req, res, next));
router.delete("/:id", (req, res, next) =>
  UserController.delete(req, res, next)
);

export default router;
