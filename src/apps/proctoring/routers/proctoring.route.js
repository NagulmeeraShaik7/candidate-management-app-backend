// src/apps/proctoring/routes/proctoring.route.js
import express from "express";
import proctoringController from "../controllers/proctoring.controller.js";
import AuthMiddleware from "../../../middleware/auth.middleware.js"; // reuse your auth
import RoleMiddleware from "../../../middleware/role.middleware.js"; // reuse your role checks if needed


const router = express.Router();
const roleMiddleware = new RoleMiddleware();
// Protect routes — only authenticated users (front-end test client & admin) should call.
router.use(AuthMiddleware.authenticate);

// POST log (create a proctoring log entry)
router.post("/log", roleMiddleware.requireRole(["admin", "user"]), proctoringController.log);

// GET report by examId
router.get("/:examId", roleMiddleware.requireRole(["admin", "user"]), proctoringController.report);

export default router;
