// src/apps/proctoring/controllers/proctoring.controller.js
import ProctoringUseCase from "../usecases/proctoring.usecase.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";

const usecase = new ProctoringUseCase();

const sendSuccess = (res, data = {}, status = 200) => res.status(status).json({ success: true, data });
const sendError = (res, err) => {
  if (!err) return res.status(500).json({ success: false, error: "Internal Server Error" });
  switch (err.name) {
    case "ValidationError":
      return res.status(400).json({ success: false, error: "Validation Error", message: err.message });
    case "NotFoundError":
      return res.status(404).json({ success: false, error: "Not Found", message: err.message });
    default:
      console.error("ProctoringController unexpected error:", err);
      return res.status(err.code || 500).json({ success: false, error: err.name || "Error", message: err.message || "Something went wrong" });
  }
};

class ProctoringController {
  // POST /api/proctoring/log
  log = asyncHandler(async (req, res) => {
    try {
      // Accept activity payload from client
      const { examId, candidateId, activityType, message, metadata, severity } = req.body;
      // capture IP (optional)
      const ip = req.ip || req.headers["x-forwarded-for"] || req.connection?.remoteAddress;
      const created = await usecase.logActivity({ examId, candidateId, activityType, message, metadata, severity, ip });
      return sendSuccess(res, created, 201);
    } catch (err) {
      return sendError(res, err);
    }
  });

  // GET /api/proctoring/:examId
  report = asyncHandler(async (req, res) => {
    try {
      const { examId } = req.params;
      const { limit, skip, severity } = req.query;
      const opts = {};
      if (limit) opts.limit = Math.min(parseInt(limit, 10), 5000);
      if (skip) opts.skip = parseInt(skip, 10);
      if (severity) opts.severity = severity;
      const report = await usecase.getReport(examId, opts);
      return sendSuccess(res, report);
    } catch (err) {
      return sendError(res, err);
    }
  });

  // GET /api/proctoring/admin/all-logs
  getAllLogs = asyncHandler(async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 50, 
        examId, 
        candidateId, 
        activityType, 
        severity,
        startDate,
        endDate 
      } = req.query;
      
      const filters = {};
      if (examId) filters.examId = examId;
      if (candidateId) filters.candidateId = candidateId;
      if (activityType) filters.activityType = activityType;
      if (severity) filters.severity = severity;
      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) filters.createdAt.$gte = new Date(startDate);
        if (endDate) filters.createdAt.$lte = new Date(endDate);
      }

      const options = {
        page: parseInt(page, 10),
        limit: Math.min(parseInt(limit, 10), 100), // max 100 per page
        sort: { createdAt: -1 }
      };

      const result = await usecase.getAllLogsForAdmin(filters, options);
      return sendSuccess(res, result);
    } catch (err) {
      return sendError(res, err);
    }
  });

  // GET /api/proctoring/admin/violations-summary
  getViolationsSummary = asyncHandler(async (req, res) => {
    try {
      const { examId, candidateId, startDate, endDate } = req.query;
      
      const filters = {};
      if (examId) filters.examId = examId;
      if (candidateId) filters.candidateId = candidateId;
      if (startDate || endDate) {
        filters.createdAt = {};
        if (startDate) filters.createdAt.$gte = new Date(startDate);
        if (endDate) filters.createdAt.$lte = new Date(endDate);
      }

      const summary = await usecase.getViolationsSummary(filters);
      return sendSuccess(res, summary);
    } catch (err) {
      return sendError(res, err);
    }
  });
}

export default new ProctoringController();