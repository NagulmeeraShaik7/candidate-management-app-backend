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

  async updateExam(id, data) {
    return Exam.findByIdAndUpdate(id, data, { new: true }).exec();
  }
}

export default ExamRepository;
