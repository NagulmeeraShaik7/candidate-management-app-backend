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

  async findAll({ skip = 0, limit = 50 } = {}) {
    return Exam.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('candidateId')
      .exec();
  }
}

export default ExamRepository;