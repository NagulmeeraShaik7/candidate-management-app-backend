import mongoose from "mongoose";

// Common regex patterns for validation
const PATTERNS = {
  NAME: /^[A-Za-z\s]{2,50}$/,
  PHONE: /^\+\d{1,3}[-\s]?\d{10}$/,   // accepts +91-XXXXXXXXXX or +91 XXXXXXXXXX
  QUALIFICATION: /^[A-Za-z\s]{2,100}$/,
  EXPERIENCE: /^([1-9]|[12]\d|30)$/,  // 1–30 years
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

const candidateSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Name is required'],
    trim: true,
    match: [PATTERNS.NAME, 'Name must be 2-50 characters with only letters and spaces']
  },
  phone: { 
    type: String, 
    required: [true, 'Phone number is required'],
    trim: true,
    match: [PATTERNS.PHONE, 'Phone must be in the format (e.g., +91-9848012345 or +91 9848012345)']
  },
  highestqualification: { 
    type: String,
    trim: true,
    match: [PATTERNS.QUALIFICATION, 'Qualification must be 2-100 characters with only letters and spaces']
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true,
    trim: true,
    lowercase: true,
    match: [PATTERNS.EMAIL, 'Please provide a valid email address']
  },
  gender: { 
    type: String, 
    enum: {
      values: ["Male", "Female", "Other"],
      message: 'Gender must be Male, Female, or Other'
    }
  },
  experience: { 
    type: String,
    trim: true,
    match: [PATTERNS.EXPERIENCE, 'Experience must be 1-30 years']
  },
  skills: [{ 
    type: String,
    trim: true,
    minlength: [1, 'Skill cannot be empty']
  }],
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save middleware
candidateSchema.pre('save', function(next) {
  this.sanitizeSkills();
  next();
});

// Pre-update middleware
candidateSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next) {
  if (this._update.skills) {
    this._update.skills = candidateSchema.statics.sanitizeSkillsArray(this._update.skills);
  }
  next();
});

// Method to sanitize skills array
candidateSchema.methods.sanitizeSkills = function() {
  if (this.skills && Array.isArray(this.skills)) {
    this.skills = this.constructor.sanitizeSkillsArray(this.skills);
  }
};

// Static method to sanitize skills array
candidateSchema.statics.sanitizeSkillsArray = function(skills) {
  return skills
    .map(skill => skill.trim())
    .filter(skill => skill.length > 0);
};

// Indexes for better query performance
candidateSchema.index({ email: 1 });
candidateSchema.index({ name: 1 });
candidateSchema.index({ skills: 1 });

// Virtual for formatted skills display
candidateSchema.virtual('skillsFormatted').get(function() {
  return this.skills ? this.skills.join(', ') : '';
});

// Method to add skill
candidateSchema.methods.addSkill = function(skill) {
  const trimmedSkill = skill.trim();
  if (trimmedSkill && !this.skills.includes(trimmedSkill)) {
    this.skills.push(trimmedSkill);
  }
  return this;
};

// Method to remove skill
candidateSchema.methods.removeSkill = function(skill) {
  this.skills = this.skills.filter(s => s !== skill);
  return this;
};

const Candidate = mongoose.model("Candidate", candidateSchema);
export default Candidate;
