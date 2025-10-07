// exam.route.js
import express from "express";
import examController from "../controllers/exam.controller.js";
import AuthMiddleware from "../../../middleware/auth.middleware.js";
import RoleMiddleware from "../../../middleware/role.middleware.js";

const router = express.Router();
const roleMiddleware = new RoleMiddleware();

// All routes protected
router.use(AuthMiddleware.authenticate);
// allow both users and admins by default; admin-only routes add extra middleware per-route
router.use(roleMiddleware.requireRole(['user', 'admin']));

router.post("/generate", examController.generate);
router.get("/:id", examController.get);
router.post("/:id/submit", examController.submit);
router.get("/:id/result", examController.result);

// Admin-only endpoints
router.get("/", roleMiddleware.requireRole('admin'), examController.list);
router.post("/:id/approve", roleMiddleware.requireRole('admin'), examController.approve);
router.post("/:id/finalize-review", roleMiddleware.requireRole('admin'), examController.finalizeReview);

export default router;