// exam.usecase.js
import mongoose from "mongoose";
import ExamRepository from "../repositories/exam.repository.js";
import CandidateRepository from "../../candidate/repositories/candidate.repository.js";
import OpenAI from "openai";
import dotenv from "dotenv";
import { AppError } from "../../../middleware/error.middleware.js";
import { validateSubmittedAnswers, isAnswerCorrect, canAttemptExam } from "../utils/exam.utils.js";
dotenv.config();

const repo = new ExamRepository();
const candidateRepo = new CandidateRepository();

if (!process.env.OPENAI_API_KEY) {
  throw new AppError("Missing OpenAI API Key in environment variables", 500, "ConfigError");
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class ExamUseCase {
  async generateExam(candidateId) {
    console.log("generateExam called with candidateId:", candidateId);

    if (!mongoose.isValidObjectId(candidateId)) {
      console.error("Invalid candidateId format:", candidateId);
      throw new AppError("Invalid candidate ID", 400, "ValidationError");
    }

    const candidate = await candidateRepo.findById(candidateId);
    console.log("Fetched candidate:", candidate);

    if (!candidate) throw new AppError("Candidate not found", 404, "NotFoundError");

    // ✅ Attempt validation: allow only once in 10 days
    const lastExam = await repo.findLatestByCandidate(candidateId);
    if (lastExam && !canAttemptExam(lastExam.createdAt)) {
      throw new AppError(
        "You can only attempt the exam once every 10 days",
        403,
        "AttemptNotAllowed"
      );
    }

    const skills = Array.isArray(candidate.skills) ? candidate.skills.join(", ") : "None";
    const experience = candidate.experience || "0";
    const qualification = candidate.highestqualification || "N/A";

    const prompt = `
      Generate 25 technical questions for a candidate. Include a mix of mcqs, msqs, short-answer, and scenario-based questions.
      The questions should be relevant to the candidate's profile and skills. Include within short answer questions some coding questions as well.
      Candidate Profile:
      - Name: ${candidate.name}
      - Experience: ${experience} years
      - Skills: ${skills}
      - Qualification: ${qualification}

      Requirements:
      - Mix of MCQs, MSQs, short-answer, and scenario-based questions.
      - Each question must follow this JSON format:
      {
        "question": "string",
        "type": "mcq|msq|short|descriptive",
        "options": ["opt1","opt2"],
        "correctAnswer": "answer" or ["answer1", "answer2"]
      }
      - For MCQ: correctAnswer should be a string with the correct option
      - For MSQ: correctAnswer should be an array of correct options
      - For short/descriptive: correctAnswer should be a string with expected answer
      Return ONLY a JSON array.
    `;

    console.log("Sending prompt to OpenAI:", prompt);

    let aiRes;
    try {
      aiRes = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an exam generator. Always return valid JSON only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      });
    } catch (err) {
      console.error("OpenAI API error:", err);
      throw new AppError("Failed to call OpenAI API", 500, "OpenAIError");
    }

    console.log("Raw AI response:", aiRes);

    let questions;
    try {
      let raw = aiRes.choices[0]?.message?.content?.trim();
      console.log("Raw AI content:", raw);

      raw = raw.replace(/```json\s*|\s*```/g, "").trim();
      questions = JSON.parse(raw);

      if (!Array.isArray(questions)) {
        console.error("Parsed AI response is not an array:", questions);
        throw new AppError("AI returned invalid JSON structure", 500, "AIParseError");
      }

      console.log("Parsed questions array length:", questions.length);
    } catch (e) {
      console.error("Failed to parse AI JSON:", e);
      throw new AppError("AI returned invalid JSON", 500, "AIParseError");
    }

    // Transform questions to ensure proper format
    const transformedQuestions = questions.map((q, index) => {
      let transformedQuestion = { ...q };

      // Ensure type is valid
      if (!["mcq", "msq", "short", "descriptive"].includes(transformedQuestion.type)) {
        transformedQuestion.type = "mcq"; // Default to MCQ
      }

      // Handle correctAnswer format
      if (transformedQuestion.type === "msq") {
        // For MSQ, ensure correctAnswer is an array
        if (!Array.isArray(transformedQuestion.correctAnswer)) {
          transformedQuestion.correctAnswer = [transformedQuestion.correctAnswer];
        }
      } else {
        // For other types, ensure correctAnswer is a string
        if (Array.isArray(transformedQuestion.correctAnswer)) {
          transformedQuestion.correctAnswer = transformedQuestion.correctAnswer[0] || "";
        }
      }

      // Ensure options array exists for MCQ and MSQ
      if (["mcq", "msq"].includes(transformedQuestion.type)) {
        if (!Array.isArray(transformedQuestion.options) || transformedQuestion.options.length === 0) {
          transformedQuestion.options = ["Option 1", "Option 2", "Option 3", "Option 4"];
        }
      } else {
        transformedQuestion.options = [];
      }

      return transformedQuestion;
    });

    console.log("Transformed questions:", transformedQuestions.length);

    try {
      const savedExam = await repo.createExam({
        candidateId,
        questions: transformedQuestions,
        status: "generated"
      });
      console.log("Saved exam to DB:", savedExam._id);
      return savedExam;
    } catch (err) {
      console.error("Failed to save exam to DB:", err);
      if (err.name === 'ValidationError') {
        console.error("Validation errors:", err.errors);
      }
      throw new AppError("Failed to save exam to database", 500, "DatabaseError");
    }
  }

  async getExam(id) {
    console.log("getExam called with id:", id);
    const exam = await repo.findById(id);
    console.log("Fetched exam:", exam?._id);
    if (!exam) throw new AppError("Exam not found", 404, "NotFoundError");
    return exam;
  }

  async submitExam(id, answers) {
    console.log("submitExam called with id:", id, "answers:", answers);
    
    if (!answers || typeof answers !== 'object') {
      throw new AppError("Answers must be provided as an object", 400, "ValidationError");
    }

    const exam = await repo.findById(id);
    if (!exam) throw new AppError("Exam not found", 404, "NotFoundError");

    if (exam.status === "submitted" || exam.status === "graded") {
      throw new AppError("Exam already submitted", 400, "AlreadySubmittedError");
    }

    if (!validateSubmittedAnswers(answers, exam.questions)) {
      console.error("Answers validation failed. Answers:", answers, "Questions count:", exam.questions.length);
      throw new AppError("Invalid answers format or structure", 400, "ValidationError");
    }

    let score = 0;
    exam.questions.forEach((q, idx) => {
      const given = answers[idx.toString()]; // Ensure string key access
      if (isAnswerCorrect(q, given)) {
        score++;
      }
    });

    console.log("Calculated score:", score, "out of", exam.questions.length);

    const updated = await repo.updateExam(id, {
      submittedAnswers: answers,
      score,
      status: "graded",
      submittedAt: new Date(),
      gradedAt: new Date()
    });

    console.log("Updated exam after submission:", updated._id);
    return updated;
  }

  async getResult(id) {
    console.log("getResult called with id:", id);
    const exam = await repo.findById(id);
    if (!exam) throw new AppError("Exam not found", 404, "NotFoundError");
    if (exam.status !== "graded") throw new AppError("Exam not graded yet", 400, "NotReadyError");

    const percentage = (exam.score / exam.questions.length) * 100;
    const qualified = percentage >= 70;
    
    const result = {
      score: exam.score,
      total: exam.questions.length,
      percentage: percentage.toFixed(2),
      qualified,
      status: exam.status,
      submittedAt: exam.submittedAt,
      answers: exam.submittedAnswers
    };

    console.log("Exam result:", result);
    return result;
  }

  // Admin: list exams with pagination
  async listExams(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const exams = await repo.findAll({ skip, limit });
    return exams;
  }

  // Admin: approve an exam and set visibleAt based on delayMinutes
  async approveExam(id, delayMinutes = 60) {
    console.log("approveExam called with id:", id, "delayMinutes:", delayMinutes);
    const exam = await repo.findById(id);
    if (!exam) throw new AppError("Exam not found", 404, "NotFoundError");

    // Only allow approving generated or graded exams
    if (!["generated", "graded"].includes(exam.status)) {
      throw new AppError("Exam cannot be approved in its current state", 400, "InvalidState");
    }

    const visibleAt = new Date(Date.now() + Math.max(0, Number(delayMinutes)) * 60 * 1000);

    const updated = await repo.updateExam(id, {
      approved: true,
      approvedAt: new Date(),
      visibleAt,
      status: exam.status // keep current status (graded stays graded)
    });

    return updated;
  }
}

export default ExamUseCase;