// src/apps/proctoring/routes/proctoring.route.js
import express from "express";
import proctoringController from "../controllers/proctoring.controller.js";
import AuthMiddleware from "../../../middleware/auth.middleware.js"; // reuse your auth


const router = express.Router();

// Protect routes — only authenticated users (front-end test client & admin) should call.
router.use(AuthMiddleware.authenticate);

// POST log (create a proctoring log entry)
router.post("/log", proctoringController.log);

// GET report by examId
router.get("/:examId", proctoringController.report);

export default router;
