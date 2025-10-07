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
  status: { 
    type: String, 
    enum: ["generated", "submitted", "graded"], 
    default: "generated" 
  },
  // Admin approval fields
  approved: {
    type: Boolean,
    default: false
  },
  approvedAt: {
    type: Date
  },
  visibleAt: {
    type: Date
  },
  generatedAt: { 
    type: Date, 
    default: Date.now 
  },
  submittedAt: { 
    type: Date 
  },
  gradedAt: { 
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
  // ensure approval fields exist
  exam.approved = exam.approved || false;
  exam.approvedAt = exam.approvedAt || null;
  exam.visibleAt = exam.visibleAt || null;
  return exam;
};

// Index for better query performance
examSchema.index({ candidateId: 1 });
examSchema.index({ status: 1 });
examSchema.index({ createdAt: -1 });
examSchema.index({ approved: 1 });
examSchema.index({ visibleAt: 1 });

const Exam = mongoose.model("Exam", examSchema);
export default Exam;