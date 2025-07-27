// Common validation utility functions

// Regex patterns for validation
export const PATTERNS = {
  NAME: /^[A-Za-z\s]{2,50}$/,
  PHONE: /^\+\d{1,3}-\d{10}$/,
  QUALIFICATION: /^[A-Za-z\s]{2,100}$/,
  EXPERIENCE: /^([1-9]|[12]\d|30)$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  OBJECT_ID: /^[0-9a-fA-F]{24}$/
};

// Validation functions
export const validators = {
  // Name validation
  isValidName: (name) => {
    return typeof name === 'string' && PATTERNS.NAME.test(name.trim());
  },

  // Email validation
  isValidEmail: (email) => {
    return typeof email === 'string' && PATTERNS.EMAIL.test(email.trim().toLowerCase());
  },

  // Phone validation
  isValidPhone: (phone) => {
    return typeof phone === 'string' && PATTERNS.PHONE.test(phone.trim());
  },

  // Qualification validation
  isValidQualification: (qualification) => {
    return !qualification || (typeof qualification === 'string' && PATTERNS.QUALIFICATION.test(qualification.trim()));
  },

  // Experience validation
  isValidExperience: (experience) => {
    if (!experience) return true;
    const exp = parseInt(experience);
    return !isNaN(exp) && exp >= 1 && exp <= 30;
  },

  // Skills validation and sanitization
  sanitizeSkills: (skills) => {
    if (!skills) return [];
    
    if (Array.isArray(skills)) {
      return skills.map(skill => skill.trim()).filter(Boolean);
    }
    
    if (typeof skills === 'string') {
      return skills.split(/[,;|]/).map(skill => skill.trim()).filter(Boolean);
    }
    
    return [];
  },

  // Object ID validation
  isValidObjectId: (id) => {
    return typeof id === 'string' && PATTERNS.OBJECT_ID.test(id);
  },

  // Gender validation
  isValidGender: (gender) => {
    return !gender || ['Male', 'Female', 'Other'].includes(gender);
  }
};

// Data sanitization functions
export const sanitizers = {
  // Sanitize candidate data
  sanitizeCandidateData: (data) => {
    const sanitized = {};

    if (data.name) {
      sanitized.name = data.name.trim();
    }

    if (data.email) {
      sanitized.email = data.email.trim().toLowerCase();
    }

    if (data.phone) {
      sanitized.phone = data.phone.trim();
    }

    if (data.highestqualification) {
      sanitized.highestqualification = data.highestqualification.trim();
    }

    if (data.experience) {
      sanitized.experience = parseInt(data.experience).toString();
    }

    if (data.gender) {
      sanitized.gender = data.gender;
    }

    if (data.skills) {
      sanitized.skills = validators.sanitizeSkills(data.skills);
    }

    return sanitized;
  },

  // Sanitize string input
  sanitizeString: (str) => {
    return typeof str === 'string' ? str.trim() : str;
  },

  // Sanitize number input
  sanitizeNumber: (num) => {
    const parsed = parseInt(num);
    return isNaN(parsed) ? null : parsed;
  }
};

// Validation error messages
export const ERROR_MESSAGES = {
  NAME: 'Name must be 2-50 characters with only letters and spaces',
  EMAIL: 'Please provide a valid email address',
  PHONE: 'Phone must be in the format (e.g., +91-9848012345)',
  QUALIFICATION: 'Qualification must be 2-100 characters with only letters and spaces',
  EXPERIENCE: 'Experience must be 1-30 years',
  GENDER: 'Gender must be Male, Female, or Other',
  SKILLS: 'Skills must be provided as array or comma-separated string',
  REQUIRED: 'This field is required',
  INVALID_ID: 'Invalid ID format',
  DUPLICATE_EMAIL: 'Email already exists'
};

// Complete validation function for candidate data
export const validateCandidateData = (data) => {
  const errors = [];

  // Required fields validation
  if (!data.name) {
    errors.push({ field: 'name', message: ERROR_MESSAGES.REQUIRED });
  } else if (!validators.isValidName(data.name)) {
    errors.push({ field: 'name', message: ERROR_MESSAGES.NAME });
  }

  if (!data.email) {
    errors.push({ field: 'email', message: ERROR_MESSAGES.REQUIRED });
  } else if (!validators.isValidEmail(data.email)) {
    errors.push({ field: 'email', message: ERROR_MESSAGES.EMAIL });
  }

  if (!data.phone) {
    errors.push({ field: 'phone', message: ERROR_MESSAGES.REQUIRED });
  } else if (!validators.isValidPhone(data.phone)) {
    errors.push({ field: 'phone', message: ERROR_MESSAGES.PHONE });
  }

  // Optional fields validation
  if (data.highestqualification && !validators.isValidQualification(data.highestqualification)) {
    errors.push({ field: 'highestqualification', message: ERROR_MESSAGES.QUALIFICATION });
  }

  if (data.experience && !validators.isValidExperience(data.experience)) {
    errors.push({ field: 'experience', message: ERROR_MESSAGES.EXPERIENCE });
  }

  if (data.gender && !validators.isValidGender(data.gender)) {
    errors.push({ field: 'gender', message: ERROR_MESSAGES.GENDER });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}; 