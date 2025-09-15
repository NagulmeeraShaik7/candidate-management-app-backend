import { body, validationResult } from 'express-validator';
import { PATTERNS, ERROR_MESSAGES } from '../utils/validation.utils.js';

// Validation rules for candidate data
export const validateCandidate = [
  // Name validation: only letters and spaces, 2-50 chars
  body('name')
    .trim()
    .matches(PATTERNS.NAME)
    .withMessage(ERROR_MESSAGES.NAME),

  // Email validation: valid email format
  body('email')
    .trim()
    .toLowerCase()
    .matches(PATTERNS.EMAIL)
    .withMessage(ERROR_MESSAGES.EMAIL),

  // Phone validation: country code + dash + 10 digits
  body('phone')
    .trim()
    .matches(PATTERNS.PHONE)
    .withMessage(ERROR_MESSAGES.PHONE),

  // Highest qualification validation: only letters and spaces
  body('highestqualification')
    .optional()
    .trim()
    .matches(PATTERNS.QUALIFICATION)
    .withMessage(ERROR_MESSAGES.QUALIFICATION),

  // Experience validation: 1-30 years
  body('experience')
    .optional()
    .customSanitizer((value) => value === undefined || value === null ? '' : String(value))
    .trim()
    .matches(PATTERNS.EXPERIENCE)
    .withMessage(ERROR_MESSAGES.EXPERIENCE),

  // Skills validation: convert to array format
  body('skills')
    .optional()
    .customSanitizer((value) => {
      if (!value) return [];
      
      if (Array.isArray(value)) {
        return value.map(skill => skill.trim()).filter(Boolean);
      }
      
      if (typeof value === 'string') {
        return value.split(/[,;|]/).map(skill => skill.trim()).filter(Boolean);
      }
      
      return [];
    })
    .isArray({ min: 0 })
    .withMessage(ERROR_MESSAGES.SKILLS),

  // Gender validation
  body('gender')
    .optional()
    .isIn(['Male', 'Female', 'Other'])
    .withMessage(ERROR_MESSAGES.GENDER),
];

// Optimized validation error handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (errors.isEmpty()) {
    return next();
  }

  const errorDetails = errors.array().map(err => ({
    field: err.path,
    message: err.msg,
    value: err.value
  }));

  return res.status(400).json({
    success: false,
    error: 'Validation Error',
    message: 'Validation failed',
    details: errorDetails
  });
};

// Optimized skills sanitizer
export const sanitizeSkills = (req, res, next) => {
  if (req.body.skills) {
    req.body.skills = Array.isArray(req.body.skills) 
      ? req.body.skills.map(skill => skill.trim()).filter(Boolean)
      : req.body.skills.split(/[,;|]/).map(skill => skill.trim()).filter(Boolean);
  }
  next();
};

// Additional validation for specific fields
export const validateExperience = (req, res, next) => {
  const { experience } = req.body;
  
  if (experience) {
    const exp = parseInt(experience);
    if (isNaN(exp) || exp < 1 || exp > 30) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: ERROR_MESSAGES.EXPERIENCE,
        details: [{
          field: 'experience',
          message: ERROR_MESSAGES.EXPERIENCE,
          value: experience
        }]
      });
    }
  }
  
  next();
}; 