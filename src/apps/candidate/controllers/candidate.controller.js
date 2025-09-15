// candidate.controller.js
import CandidateUseCase from "../usecases/candidate.usecase.js";
import { asyncHandler } from "../../../middleware/error.middleware.js";

const usecase = new CandidateUseCase();

/**
 * Helper responses
 */
const sendSuccess = (res, data, status = 200) => res.status(status).json({ success: true, data });
const sendError = (res, err) => {
  // err may be AppError or generic Error
  if (!err) return res.status(500).json({ success: false, error: "Internal Server Error" });

  switch (err.name) {
    case "ValidationError":
      return res.status(400).json({ success: false, error: "Validation Error", message: err.message, field: err.field });
    case "NotFoundError":
      return res.status(404).json({ success: false, error: "Not Found", message: err.message });
    case "DuplicateError":
      return res.status(409).json({ success: false, error: "Duplicate Error", message: err.message });
    default:
      console.error("Controller unexpected error:", err);
      return res.status(err.code || 500).json({ success: false, error: err.name || "Error", message: err.message || "Something went wrong" });
  }
};

class CandidateController {
  // GET /candidates
  list = asyncHandler(async (req, res) => {
    try {
      const results = await usecase.listCandidates(req.query);
      return sendSuccess(res, results);
    } catch (err) {
      return sendError(res, err);
    }
  });

  // GET /candidates/:id
  get = asyncHandler(async (req, res) => {
    try {
      const candidate = await usecase.getCandidate(req.params.id);
      return sendSuccess(res, candidate);
    } catch (err) {
      return sendError(res, err);
    }
  });

  // POST /candidates
  create = asyncHandler(async (req, res) => {
    try {
      const created = await usecase.addCandidate(req.body);
      return sendSuccess(res, created, 201);
    } catch (err) {
      return sendError(res, err);
    }
  });

  // PUT /candidates/:id
  update = asyncHandler(async (req, res) => {
    try {
      const updated = await usecase.editCandidate(req.params.id, req.body);
      return sendSuccess(res, updated);
    } catch (err) {
      return sendError(res, err);
    }
  });

  // DELETE /candidates/:id
  remove = asyncHandler(async (req, res) => {
    try {
      await usecase.removeCandidate(req.params.id);
      return sendSuccess(res, { message: "Candidate deleted successfully" });
    } catch (err) {
      return sendError(res, err);
    }
  });

  // Extra: GET /candidates/stats/top-skills
  topSkills = asyncHandler(async (req, res) => {
    try {
      const limit = req.query.limit || 10;
      const stats = await usecase.getTopSkills(limit);
      return sendSuccess(res, stats);
    } catch (err) {
      return sendError(res, err);
    }
  });
}

// export singleton to use in router
export default new CandidateController();
