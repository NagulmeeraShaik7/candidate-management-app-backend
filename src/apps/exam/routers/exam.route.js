// exam.route.js
import express from "express";
import examController from "../controllers/exam.controller.js";
import AuthMiddleware from "../../../middleware/auth.middleware.js";
import RoleMiddleware from "../../../middleware/role.middleware.js";

const router = express.Router();
const roleMiddleware = new RoleMiddleware();

// User routes
router.use(AuthMiddleware.authenticate);

// User specific routes
router.post("/generate", roleMiddleware.requireRole('user'), examController.generate);
router.get("/:id", roleMiddleware.requireRole('user'), examController.get);
router.post("/:id/submit", roleMiddleware.requireRole('user'), examController.submit);
router.get("/:id/result", roleMiddleware.requireRole('user'), examController.result);

// NEW: Admin routes
router.get("/", roleMiddleware.requireRole('admin'), examController.getAllResults);
router.get("/:id/review", roleMiddleware.requireRole('admin'), examController.getExamForReview);
router.post("/:id/grade", roleMiddleware.requireRole('admin'), examController.manualGrading);

export default router;