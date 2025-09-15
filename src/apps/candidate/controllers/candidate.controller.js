import CandidateUseCase from "../usecases/candidate.usecase.js";

const usecase = new CandidateUseCase();

// Helper function for consistent error responses
const handleError = (error, res) => {
  if (error.name === 'ValidationError') {
    // Mongoose validation error
    if (error.errors) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: error.message,
        details: Object.keys(error.errors).map(field => ({
          field,
          message: error.errors[field].message,
          value: error.errors[field].value
        }))
      });
    }
    // Custom validation error
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: error.message,
      field: error.field
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID',
      message: 'Invalid candidate ID format'
    });
  }
  
  console.error('Controller Error:', error);
  return res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: error.message || 'Something went wrong',
    details: error.stack
  });
};

// Helper function for successful responses
const sendSuccess = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data
  });
};

export const getCandidates = async (req, res, next) => {
  try {
    const result = await usecase.listCandidates();
    return sendSuccess(res, result);
  } catch (error) {
    return handleError(error, res);
  }
};

export const getCandidate = async (req, res, next) => {
  try {
    const result = await usecase.getCandidate(req.params.id);
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Candidate not found'
      });
    }
    return sendSuccess(res, result);
  } catch (error) {
    return handleError(error, res);
  }
};

export const postCandidate = async (req, res, next) => {
  try {
    const result = await usecase.addCandidate(req.body);
    return sendSuccess(res, result, 201);
  } catch (error) {
    return handleError(error, res);
  }
};

export const putCandidate = async (req, res, next) => {
  try {
    const result = await usecase.editCandidate(req.params.id, req.body);
    return sendSuccess(res, result);
  } catch (error) {
    if (error.name === 'ValidationError' && error.field === 'id') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Candidate not found with the given ID'
      });
    }
    return handleError(error, res);
  }
};


export const deleteCandidate = async (req, res, next) => {
  try {
    await usecase.removeCandidate(req.params.id);
    return sendSuccess(res, { message: 'Candidate deleted successfully' });
  } catch (error) {
    return handleError(error, res);
  }
};