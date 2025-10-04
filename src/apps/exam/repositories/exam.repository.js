// exam.repository.js
import mongoose from "mongoose";
import Exam from "../models/exam.model.js";

class ExamRepository {
  async createExam(data, session = null) {
    if (session) {
      return Exam.create([data], { session }).then(resArr => resArr[0]);
    }
    return Exam.create(data);
  }

  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return Exam.findById(id).populate("candidateId").exec();
  }

  async findLatestByCandidate(candidateId) {
    return await Exam.findOne({ candidateId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateExam(id, data) {
    // Convert answers object to Map for storage
    if (data.submittedAnswers && typeof data.submittedAnswers === 'object') {
      data.submittedAnswers = new Map(Object.entries(data.submittedAnswers));
    }
    
    return Exam.findByIdAndUpdate(id, data, { new: true, runValidators: true }).exec();
  }

  async findByCandidateId(candidateId) {
    return Exam.find({ candidateId }).sort({ createdAt: -1 }).exec();
  }

  // NEW: Find all exams with filtering and pagination
  async findAllExams({ page = 1, limit = 10, candidateId, status, qualified }) {
    const query = {};
    
    if (candidateId) {
      query.candidateId = candidateId;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (qualified !== undefined) {
      // Calculate minimum score needed for qualification (70%)
      // We'll handle this in the use case for better performance
      query.score = qualified ? { $gte: 18 } : { $lt: 18 }; // 18/25 = 72%
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
      populate: {
        path: 'candidateId',
        select: 'name email experience skills highestqualification'
      }
    };

    // Using mongoose-paginate-v2 would be better here, but for simplicity:
    const skip = (page - 1) * limit;
    
    const [exams, total] = await Promise.all([
      Exam.find(query)
        .populate('candidateId', 'name email experience skills highestqualification')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Exam.countDocuments(query)
    ]);

    return {
      exams,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    };
  }

  // NEW: Update manual grading data
  async updateManualGrading(examId, manualGradingData) {
    return Exam.findByIdAndUpdate(
      examId, 
      { 
        $set: { 
          manualGrading: manualGradingData,
          status: 'manually_graded'
        } 
      }, 
      { new: true, runValidators: true }
    ).populate("candidateId").exec();
  }
}

export default ExamRepository;