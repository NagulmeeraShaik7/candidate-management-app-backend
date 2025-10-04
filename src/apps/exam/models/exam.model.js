// exam.model.js
import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String }],
  correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
  type: { 
    type: String, 
    enum: ["mcq", "msq", "short", "descriptive"], 
    required: true 
  }
});

const manualGradingSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  score: { type: Number, required: true, min: 0, max: 1 },
  feedback: { type: String, default: "" },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  gradedAt: { type: Date, default: Date.now }
});

const examSchema = new mongoose.Schema({
  candidateId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Candidate", 
    required: true 
  },
  questions: [questionSchema],
  submittedAnswers: { 
    type: Map, 
    of: mongoose.Schema.Types.Mixed, 
    default: new Map() 
  },
  score: { 
    type: Number, 
    default: null 
  },
  manualScore: {
    type: Number,
    default: null
  },
  finalScore: {
    type: Number,
    default: null
  },
  status: { 
    type: String, 
    enum: ["generated", "submitted", "graded", "manually_graded", "under_review"], 
    default: "generated" 
  },
  manualGrading: [manualGradingSchema],
  generatedAt: { 
    type: Date, 
    default: Date.now 
  },
  submittedAt: { 
    type: Date 
  },
  gradedAt: { 
    type: Date 
  },
  reviewedAt: {
    type: Date
  }
}, { 
  timestamps: true 
});

// Convert Map to Object when converting to JSON
examSchema.methods.toJSON = function() {
  const exam = this.toObject();
  if (exam.submittedAnswers instanceof Map) {
    exam.submittedAnswers = Object.fromEntries(exam.submittedAnswers);
  } else if (exam.submittedAnswers && typeof exam.submittedAnswers === 'object') {
    // Already an object, no conversion needed
  } else {
    exam.submittedAnswers = {};
  }
  return exam;
};

// Virtual for calculating percentage
examSchema.virtual('percentage').get(function() {
  const totalQuestions = this.questions.length;
  const score = this.finalScore || this.score || 0;
  return totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
});

// Virtual for qualification status
examSchema.virtual('qualified').get(function() {
  return this.percentage >= 70;
});

// Index for better query performance
examSchema.index({ candidateId: 1 });
examSchema.index({ status: 1 });
examSchema.index({ createdAt: -1 });
examSchema.index({ score: -1 });

const Exam = mongoose.model("Exam", examSchema);
export default Exam;