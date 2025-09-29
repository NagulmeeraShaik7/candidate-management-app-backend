// src/apps/proctoring/repositories/proctoring.repository.js
import ProctoringLog from "../models/proctoring.model.js";

class ProctoringRepository {
  /**
   * Create a new proctoring log entry
   * @param {Object} data
   * @returns {Promise<Document>}
   */
  async createLog(data) {
    return ProctoringLog.create(data);
  }

  /**
   * Fetch logs for an exam (with optional pagination/filtering)
   * @param {String} examId
   * @param {Object} opts - { limit, skip, severity }
   */
  async getLogsByExam(examId, opts = {}) {
    const { limit = 1000, skip = 0, severity } = opts;
    const q = { examId };
    if (severity) q.severity = severity;
    return ProctoringLog.find(q).sort({ createdAt: 1 }).skip(skip).limit(limit).lean().exec();
  }

  /**
   * Get aggregated summary for exam (counts by activityType and severity)
   */
  async getSummaryByExam(examId) {
    const pipeline = [
      { $match: { examId: mongoose.Types.ObjectId(examId) } },
      {
        $group: {
          _id: { type: "$activityType", severity: "$severity" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "count": -1 } }
    ];
    return ProctoringLog.aggregate(pipeline).exec();
  }
}

export default ProctoringRepository;
