// src/apps/proctoring/models/proctoring.model.js
import mongoose from "mongoose";

const ProctoringLogSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    required: true,
    index: true,
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Candidate",
    required: true,
    index: true,
  },
  activityType: {
    type: String,
    required: true,
    enum: [
      "TAB_SWITCH",
      "WINDOW_SWITCH",
      "FACE_NOT_DETECTED",
      "MULTIPLE_FACES",
      "SOUND_DETECTED",
      "PHONE_DETECTED",
      "NO_FACE_FOR_LONG",
      "CHEATING_SUSPECTED",
      "CUSTOM"
    ],
  },
  message: { type: String, default: "" }, // human readable
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }, // arbitrary extra details (e.g., duration, confidence, base64 screenshot id)
  severity: { type: String, enum: ["LOW", "MEDIUM", "HIGH"], default: "LOW" },
  ip: { type: String },
  createdAt: { type: Date, default: Date.now, index: true }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Indexes for quick queries by examId + createdAt
ProctoringLogSchema.index({ examId: 1, createdAt: -1 });
ProctoringLogSchema.index({ candidateId: 1, createdAt: -1 });

const ProctoringLog = mongoose.model("ProctoringLog", ProctoringLogSchema);
export default ProctoringLog;
