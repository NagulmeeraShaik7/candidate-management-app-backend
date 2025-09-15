// Common validation utility functions

// Regex patterns for validation
export const PATTERNS = {
  NAME: /^[A-Za-z\s]{2,50}$/,
  PHONE: /^\+\d{1,3}[-\s]?\d{10}$/,
  QUALIFICATION: /^[A-Za-z\s]{2,100}$/,
  EXPERIENCE: /^([1-9]|[12]\d|30)$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  OBJECT_ID: /^[0-9a-fA-F]{24}$/,
  PASSWORD: /^.{6,}$/, // min 6 chars 
};

// Validation functions
export const validators = {
  isValidEmail: (email) => typeof email === "string" && PATTERNS.EMAIL.test(email),
  isValidPassword: (password) => typeof password === "string" && PATTERNS.PASSWORD.test(password),
  isValidName: (name) => typeof name === "string" && PATTERNS.NAME.test(name),
  isValidPhone: (phone) => typeof phone === "string" && PATTERNS.PHONE.test(phone),

  // Auth validators
  isValidRegister: ({ email, password, name }) => {
    const errors = [];

    if (!email) errors.push({ field: "email", message: ERROR_MESSAGES.REQUIRED_EMAIL });
    else if (!validators.isValidEmail(email)) errors.push({ field: "email", message: ERROR_MESSAGES.EMAIL });

    if (!password) errors.push({ field: "password", message: ERROR_MESSAGES.REQUIRED_PASSWORD });
    else if (!validators.isValidPassword(password)) errors.push({ field: "password", message: ERROR_MESSAGES.PASSWORD });

    if (name && name.trim().length < 2) {
      errors.push({ field: "name", message: ERROR_MESSAGES.REQUIRED_NAME });
    }

    return { isValid: errors.length === 0, errors };
  },

  isValidLogin: ({ email, password }) => {
    const errors = [];

    if (!email) errors.push({ field: "email", message: ERROR_MESSAGES.REQUIRED_EMAIL });
    else if (!validators.isValidEmail(email)) errors.push({ field: "email", message: ERROR_MESSAGES.EMAIL });

    if (!password) errors.push({ field: "password", message: ERROR_MESSAGES.REQUIRED_PASSWORD });
    else if (!validators.isValidPassword(password)) errors.push({ field: "password", message: ERROR_MESSAGES.PASSWORD });

    return { isValid: errors.length === 0, errors };
  },

  // Candidate validator (example)
  isValidCandidate: ({ name, email, phone }) => {
    const errors = [];

    if (!name || !validators.isValidName(name)) {
      errors.push({ field: "name", message: ERROR_MESSAGES.REQUIRED_NAME });
    }
    if (!email || !validators.isValidEmail(email)) {
      errors.push({ field: "email", message: ERROR_MESSAGES.EMAIL });
    }
    if (!phone || !validators.isValidPhone(phone)) {
      errors.push({ field: "phone", message: ERROR_MESSAGES.REQUIRED_PHONE });
    }

    return { isValid: errors.length === 0, errors };
  },
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
  DUPLICATE_EMAIL: 'Email already exists',
  EMAIL: "Invalid email format",
  PASSWORD: "Password must be at least 6 characters long",
  REQUIRED_EMAIL: "Email is required",
  REQUIRED_PASSWORD: "Password is required",
  REQUIRED_NAME: "Name must be at least 2 characters long",
  REQUIRED_PHONE: "Phone number must be 10 digits",
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





