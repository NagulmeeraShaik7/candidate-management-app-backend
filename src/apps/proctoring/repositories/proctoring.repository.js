// src/apps/proctoring/repositories/proctoring.repository.js
import ProctoringLog from "../models/proctoring.model.js";
import mongoose from "mongoose";

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
      { $match: { examId: new mongoose.Types.ObjectId(examId) } },
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

  /**
   * Get all logs with pagination and filtering for admin
   */
  async getAllLogs(filters = {}, options = {}) {
    const {
      page = 1,
      limit = 50,
      sort = { createdAt: -1 }
    } = options;

    const skip = (page - 1) * limit;

    const logs = await ProctoringLog.find(filters)
      .populate('examId', 'title description scheduledFor duration')
      .populate('candidateId', 'name email userId')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const total = await ProctoringLog.countDocuments(filters);

    return {
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get violations summary for admin dashboard
   */
  async getViolationsSummary(filters = {}) {
    const pipeline = [
      { $match: filters },
      {
        $facet: {
          // Total counts by activity type
          byActivityType: [
            {
              $group: {
                _id: "$activityType",
                count: { $sum: 1 },
                highSeverity: {
                  $sum: { $cond: [{ $eq: ["$severity", "HIGH"] }, 1, 0] }
                },
                mediumSeverity: {
                  $sum: { $cond: [{ $eq: ["$severity", "MEDIUM"] }, 1, 0] }
                },
                lowSeverity: {
                  $sum: { $cond: [{ $eq: ["$severity", "LOW"] }, 1, 0] }
                }
              }
            },
            { $sort: { count: -1 } }
          ],
          // Total counts by severity
          bySeverity: [
            {
              $group: {
                _id: "$severity",
                count: { $sum: 1 }
              }
            }
          ],
          // Counts by exam
          byExam: [
            {
              $group: {
                _id: "$examId",
                count: { $sum: 1 },
                highSeverity: {
                  $sum: { $cond: [{ $eq: ["$severity", "HIGH"] }, 1, 0] }
                }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          // Counts by candidate
          byCandidate: [
            {
              $group: {
                _id: "$candidateId",
                count: { $sum: 1 },
                highSeverity: {
                  $sum: { $cond: [{ $eq: ["$severity", "HIGH"] }, 1, 0] }
                }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          // Timeline data (last 30 days)
          timeline: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$createdAt"
                  }
                },
                count: { $sum: 1 },
                highSeverity: {
                  $sum: { $cond: [{ $eq: ["$severity", "HIGH"] }, 1, 0] }
                }
              }
            },
            { $sort: { _id: 1 } },
            { $limit: 30 }
          ],
          // Overall stats
          overall: [
            {
              $group: {
                _id: null,
                totalLogs: { $sum: 1 },
                totalHighSeverity: {
                  $sum: { $cond: [{ $eq: ["$severity", "HIGH"] }, 1, 0] }
                },
                totalMediumSeverity: {
                  $sum: { $cond: [{ $eq: ["$severity", "MEDIUM"] }, 1, 0] }
                },
                totalLowSeverity: {
                  $sum: { $cond: [{ $eq: ["$severity", "LOW"] }, 1, 0] }
                },
                uniqueExams: { $addToSet: "$examId" },
                uniqueCandidates: { $addToSet: "$candidateId" }
              }
            },
            {
              $project: {
                totalLogs: 1,
                totalHighSeverity: 1,
                totalMediumSeverity: 1,
                totalLowSeverity: 1,
                uniqueExamsCount: { $size: "$uniqueExams" },
                uniqueCandidatesCount: { $size: "$uniqueCandidates" }
              }
            }
          ]
        }
      }
    ];

    const result = await ProctoringLog.aggregate(pipeline).exec();
    return result[0];
  }
}

export default ProctoringRepository;