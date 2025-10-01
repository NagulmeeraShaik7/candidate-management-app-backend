// src/apps/proctoring/usecases/proctoring.usecase.js
import ProctoringRepository from "../repositories/proctoring.repository.js";
import CandidateRepository from "../../candidate/repositories/candidate.repository.js";
import ExamRepository from "../../exam/repositories/exam.repository.js";
import { AppError } from "../../../middleware/error.middleware.js";

const repo = new ProctoringRepository();
const candidateRepo = new CandidateRepository();
const examRepo = new ExamRepository();

class ProctoringUseCase {
  /**
   * Log an activity
   * @param {Object} payload
   */
  async logActivity(payload) {
    // basic validation
    const { examId, candidateId, activityType } = payload;
    if (!examId || !candidateId || !activityType) {
      throw new AppError("examId, candidateId and activityType are required", 400, "ValidationError");
    }

    // optional: verify candidate & exam exist (lightweight)
    const [candidate, exam] = await Promise.all([
      candidateRepo.findById(candidateId),
      examRepo.findById(examId)
    ]);

    if (!candidate) throw new AppError("Candidate not found", 404, "NotFoundError");
    if (!exam) throw new AppError("Exam not found", 404, "NotFoundError");

    // sanitize severity and metadata
    const entry = {
      examId,
      candidateId,
      activityType,
      message: payload.message || "",
      metadata: payload.metadata || {},
      severity: payload.severity || "LOW",
      ip: payload.ip || undefined
    };

    return repo.createLog(entry);
  }

  /**
   * Get proctoring report for an exam
   */
  async getReport(examId, opts = {}) {
    if (!examId) throw new AppError("examId is required", 400, "ValidationError");

    // Make sure exam exists
    const exam = await examRepo.findById(examId);
    if (!exam) throw new AppError("Exam not found", 404, "NotFoundError");

    // fetch logs, and derive a summary
    const logs = await repo.getLogsByExam(examId, opts);
    // compute counts
    const countsByType = {};
    const countsBySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0 };

    logs.forEach((l) => {
      countsByType[l.activityType] = (countsByType[l.activityType] || 0) + 1;
      countsBySeverity[l.severity] = (countsBySeverity[l.severity] || 0) + 1;
    });

    return {
      examId,
      candidateId: exam.candidateId || exam.candidate || null,
      totalLogs: logs.length,
      countsByType,
      countsBySeverity,
      logs
    };
  }

  /**
   * Get all proctoring logs for admin with filtering and pagination
   */
  async getAllLogsForAdmin(filters = {}, options = {}) {
    return repo.getAllLogs(filters, options);
  }

  /**
   * Get violations summary for admin dashboard
   */
  async getViolationsSummary(filters = {}) {
    return repo.getViolationsSummary(filters);
  }
}

export default ProctoringUseCase;