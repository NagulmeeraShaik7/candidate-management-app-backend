// exam.model.js
import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String }], // Array of strings for MCQ options
  correctAnswer: { type: String, required: true }, // Single string answer
  type: { 
    type: String, 
    enum: ["mcq", "short", "descriptive"], 
    default: "mcq",
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
  }, // Better than Object for querying
  score: { 
    type: Number, 
    default: null 
  },
  status: { 
    type: String, 
    enum: ["generated", "submitted", "graded"], 
    default: "generated" 
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

// Index for better query performance
examSchema.index({ candidateId: 1 });
examSchema.index({ status: 1 });
examSchema.index({ createdAt: -1 });

const Exam = mongoose.model("Exam", examSchema);
export default Exam;