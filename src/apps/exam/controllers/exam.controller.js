// exam.controller.js
import ExamUseCase from "../usecases/exam.usecase.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";

const usecase = new ExamUseCase();

const sendSuccess = (res, data, status = 200) => res.status(status).json({ success: true, data });
const sendError = (res, err) => res.status(err.code || 500).json({ success: false, error: err.name, message: err.message });

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
      const updated = await usecase.submitExam(req.params.id, req.body.answers);
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
}

export default new ExamController();
