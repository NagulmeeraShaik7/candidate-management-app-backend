// exam.controller.js
import ExamUseCase from "../usecases/exam.usecase.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";

const usecase = new ExamUseCase();

const sendSuccess = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });

const sendError = (res, err) =>
  res.status(err.code || 500).json({
    success: false,
    error: err.name,
    message: err.message,
  });

class ExamController {
  generate = asyncHandler(async (req, res) => {
    try {
      const exam = await usecase.generateExam(req.body.candidateId);
      return sendSuccess(res, exam, 201);
    } catch (err) {
      return sendError(res, err);
    }
  });

  get = asyncHandler(async (req, res) => {
    try {
      const exam = await usecase.getExam(req.params.id);
      return sendSuccess(res, exam);
    } catch (err) {
      return sendError(res, err);
    }
  });

  submit = asyncHandler(async (req, res) => {
    try {
      const { answers } = req.body;
      console.log("Received answers for submission:", answers);
      
      if (!answers || typeof answers !== 'object') {
        return sendError(res, {
          code: 400,
          name: "ValidationError",
          message: "Answers must be provided as an object"
        });
      }
      
      const updated = await usecase.submitExam(req.params.id, answers);
      return sendSuccess(res, updated);
    } catch (err) {
      return sendError(res, err);
    }
  });

  result = asyncHandler(async (req, res) => {
    try {
      const result = await usecase.getResult(req.params.id);
      return sendSuccess(res, result);
    } catch (err) {
      return sendError(res, err);
    }
  });

  // NEW: Get all results with filtering and pagination
  getAllResults = asyncHandler(async (req, res) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        candidateId, 
        status, 
        qualified 
      } = req.query;
      
      const results = await usecase.getAllResults({
        page: parseInt(page),
        limit: parseInt(limit),
        candidateId,
        status,
        qualified: qualified !== undefined ? qualified === 'true' : undefined
      });
      
      return sendSuccess(res, results);
    } catch (err) {
      return sendError(res, err);
    }
  });

  // NEW: Get detailed exam for admin review
  getExamForReview = asyncHandler(async (req, res) => {
    try {
      const exam = await usecase.getExamForReview(req.params.id);
      return sendSuccess(res, exam);
    } catch (err) {
      return sendError(res, err);
    }
  });

  // NEW: Admin manual grading for descriptive answers
  manualGrading = asyncHandler(async (req, res) => {
    try {
      const { questionId, score, feedback } = req.body;
      
      if (!questionId || score === undefined) {
        return sendError(res, {
          code: 400,
          name: "ValidationError",
          message: "Question ID and score are required"
        });
      }

      const updatedExam = await usecase.manualGrading(
        req.params.id, 
        questionId, 
        parseInt(score),
        feedback
      );
      
      return sendSuccess(res, updatedExam);
    } catch (err) {
      return sendError(res, err);
    }
  });
}

export default new ExamController();