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
}

export default new ProctoringController();
