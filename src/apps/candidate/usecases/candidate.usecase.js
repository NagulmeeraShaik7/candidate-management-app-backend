// candidate.usecase.js
import mongoose from "mongoose";
import CandidateRepository from "../repositories/candidate.repository.js";
import {
  validators,
  sanitizers,
  validateCandidateData,
  ERROR_MESSAGES
} from "../../../utils/validation.utils.js";

// Custom error classes for clearer handling
class AppError extends Error {
  constructor(message, code = 500, name = "AppError", meta = {}) {
    super(message);
    this.name = name;
    this.code = code;
    this.meta = meta;
  }
}
class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400, "ValidationError");
    this.field = field;
  }
}
class NotFoundError extends AppError {
  constructor(message = "Not Found") {
    super(message, 404, "NotFoundError");
  }
}
class DuplicateError extends AppError {
  constructor(message = "Duplicate") {
    super(message, 409, "DuplicateError");
  }
}

const repo = new CandidateRepository();

class CandidateUseCase {
  async listCandidates(query = {}) {
    // Normalize options coming from controller/query params
    const options = {
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? Math.min(parseInt(query.limit, 10), 100) : 10,
      search: query.search || undefined,
      sort: this._parseSort(query.sort),
      fields: query.fields ? String(query.fields).split(",").map(f => f.trim()).filter(Boolean) : undefined,
      filters: {
        gender: query.gender,
        skill: query.skill,
        minExp: query.minExp,
        maxExp: query.maxExp
      }
    };

    return repo.list(options);
  }

  async getCandidate(id) {
    if (!validators.isValidObjectId(id)) {
      throw new ValidationError(ERROR_MESSAGES.INVALID_ID, "id");
    }
    const candidate = await repo.findById(id);
    if (!candidate) throw new NotFoundError("Candidate not found");
    return candidate;
  }

  async addCandidate(data) {
    // Business-level validation
    const validation = validateCandidateData(data);
    if (!validation.isValid) {
      const first = validation.errors[0];
      throw new ValidationError(first.message, first.field);
    }

    const sanitized = sanitizers.sanitizeCandidateData(data);

    // Use session for creation to be safe if you later expand to multi-doc transactions
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const created = await repo.create(sanitized, session);
      await session.commitTransaction();
      session.endSession();
      return created;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();

      // Duplicate key
      if (err && err.code === 11000) {
        throw new DuplicateError(ERROR_MESSAGES.DUPLICATE_EMAIL);
      }

      // propagate known validation errors
      if (err.name === "ValidationError") {
        throw new ValidationError(err.message);
      }

      throw new AppError("Failed to create candidate");
    }
  }

  async editCandidate(id, data) {
    if (!validators.isValidObjectId(id)) {
      throw new ValidationError(ERROR_MESSAGES.INVALID_ID, "id");
    }

    const validation = validateCandidateData(data);
    if (!validation.isValid) {
      const first = validation.errors[0];
      throw new ValidationError(first.message, first.field);
    }

    const sanitized = sanitizers.sanitizeCandidateData(data);

    try {
      const updated = await repo.update(id, sanitized, { new: true });
      if (!updated) throw new NotFoundError("Candidate not found");
      return updated;
    } catch (err) {
      if (err && err.code === 11000) {
        throw new DuplicateError(ERROR_MESSAGES.DUPLICATE_EMAIL);
      }
      if (err.name === "ValidationError") {
        throw new ValidationError(err.message);
      }
      throw new AppError("Failed to update candidate");
    }
  }

  async removeCandidate(id) {
    if (!validators.isValidObjectId(id)) {
      throw new ValidationError(ERROR_MESSAGES.INVALID_ID, "id");
    }

    const deleted = await repo.delete(id);
    if (!deleted) throw new NotFoundError("Candidate not found");
    return deleted;
  }

  async getTopSkills(limit = 10) {
    const n = Math.min(50, parseInt(limit, 10) || 10);
    return repo.aggregateTopSkills(n);
  }

  // Helper to parse sort query param (e.g. "name:asc,createdAt:desc")
  _parseSort(sortQuery) {
    if (!sortQuery) return { createdAt: -1 };
    try {
      const parts = String(sortQuery).split(",").map(s => s.trim()).filter(Boolean);
      const sort = {};
      parts.forEach(p => {
        const [k, dir] = p.split(":").map(x => x.trim());
        sort[k] = (!dir || dir.toLowerCase() === "desc") ? -1 : 1;
      });
      return sort;
    } catch (e) {
      return { createdAt: -1 };
    }
  }
}

export default CandidateUseCase;
