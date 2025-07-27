import CandidateRepository from "../repositories/candidate.repository.mjs";
import { validators, sanitizers, validateCandidateData, ERROR_MESSAGES } from "../../../utils/validation.utils.mjs";

const repo = new CandidateRepository();

// Custom error class for validation
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export default class CandidateUseCase {
  async listCandidates() {
    try {
      return await repo.findAll();
    } catch (error) {
      throw new Error('Failed to fetch candidates');
    }
  }

  async getCandidate(id) {
    try {
      if (!validators.isValidObjectId(id)) {
        throw new ValidationError(ERROR_MESSAGES.INVALID_ID, 'id');
      }
      return await repo.findById(id);
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new Error('Failed to fetch candidate');
    }
  }

  async addCandidate(data) {
    try {
      // Validate candidate data
      const validation = validateCandidateData(data);
      if (!validation.isValid) {
        const firstError = validation.errors[0];
        throw new ValidationError(firstError.message, firstError.field);
      }
      
      // Sanitize data
      const sanitizedData = sanitizers.sanitizeCandidateData(data);
      
      return await repo.create(sanitizedData);
    } catch (error) {
      console.error('Actual error in addCandidate:', error);
      if (error.code === 11000) {
        throw new ValidationError(ERROR_MESSAGES.DUPLICATE_EMAIL, 'email');
      }
      if (error instanceof ValidationError) throw error;
      throw new Error('Failed to create candidate');
    }
  }

 async editCandidate(id, data) {
  try {
    if (!validators.isValidObjectId(id)) {
      throw new ValidationError(ERROR_MESSAGES.INVALID_ID, 'id');
    }

    // Validate candidate data
    const validation = validateCandidateData(data);
    if (!validation.isValid) {
      const firstError = validation.errors[0];
      throw new ValidationError(firstError.message, firstError.field);
    }

    // Sanitize data
    const sanitizedData = sanitizers.sanitizeCandidateData(data);

    const result = await repo.update(id, sanitizedData);

    if (!result) {
      console.warn(`Candidate not found with ID: ${id}`);
      throw new ValidationError('Candidate not found', 'id');
    }

    return result;
  } catch (error) {
    if (error.code === 11000) {
      throw new ValidationError(ERROR_MESSAGES.DUPLICATE_EMAIL, 'email');
    }
    if (error instanceof ValidationError) throw error;
    console.error('editCandidate Error:', error);
    throw new Error('Failed to update candidate');
  }
}

  async removeCandidate(id) {
    try {
      if (!validators.isValidObjectId(id)) {
        throw new ValidationError(ERROR_MESSAGES.INVALID_ID, 'id');
      }
      
      const result = await repo.delete(id);
      if (!result) {
        throw new ValidationError('Candidate not found', 'id');
      }
      
      return result;
    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new Error('Failed to delete candidate');
    }
  }
}