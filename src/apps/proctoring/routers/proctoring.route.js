// src/apps/proctoring/routes/proctoring.route.js
import express from "express";
import proctoringController from "../controllers/proctoring.controller.js";
import AuthMiddleware from "../../../middleware/auth.middleware.js";
import RoleMiddleware from "../../../middleware/role.middleware.js";

const router = express.Router();
const roleMiddleware = new RoleMiddleware();

// Protect routes — only authenticated users (front-end test client & admin) should call.
router.use(AuthMiddleware.authenticate);

// POST log (create a proctoring log entry)
router.post("/log", roleMiddleware.requireRole(["admin", "user"]), proctoringController.log);

// GET report by examId
router.get("/:examId", roleMiddleware.requireRole(["admin", "user"]), proctoringController.report);

// ADMIN ROUTES - Get all proctoring logs with filtering
router.get("/admin/all-logs", roleMiddleware.requireRole(["admin"]), proctoringController.getAllLogs);

// ADMIN ROUTES - Get violations summary for dashboard
router.get("/admin/violations-summary", roleMiddleware.requireRole(["admin"]), proctoringController.getViolationsSummary);

export default router;