// exam.usecase.js
import mongoose from "mongoose";
import ExamRepository from "../repositories/exam.repository.js";
import CandidateRepository from "../../candidate/repositories/candidate.repository.js";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

class AppError extends Error {
  constructor(message, code = 500, name = "AppError") {
    super(message);
    this.code = code;
    this.name = name;
  }
}

const repo = new ExamRepository();
const candidateRepo = new CandidateRepository();

if (!process.env.OPENAI_API_KEY) {
  throw new AppError("Missing OpenAI API Key in environment variables", 500);
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class ExamUseCase {
  async generateExam(candidateId) {
    console.log("generateExam called with candidateId:", candidateId);

    if (!mongoose.isValidObjectId(candidateId)) {
      console.error("Invalid candidateId format:", candidateId);
      throw new AppError("Invalid candidate ID", 400);
    }

    const candidate = await candidateRepo.findById(candidateId);
    console.log("Fetched candidate:", candidate);

    if (!candidate) throw new AppError("Candidate not found", 404);

    const skills = Array.isArray(candidate.skills) ? candidate.skills.join(", ") : "None";
    const experience = candidate.experience || "0";
    const qualification = candidate.highestqualification || "N/A";

    const prompt = `
      Generate 28 technical interview questions for a candidate.
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
        "type": "mcq|msq|short|scenario",
        "options": ["opt1","opt2"],
        "correctAnswer": ["opt1"]
      }
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
      throw new AppError("Failed to call OpenAI API", 500);
    }

    console.log("Raw AI response:", aiRes);

    let questions;
    try {
      let raw = aiRes.choices[0]?.message?.content?.trim();
      console.log("Raw AI content:", raw);

      // Remove code fences if present
      raw = raw.replace(/```json\s*|\s*```/g, "").trim();
      questions = JSON.parse(raw);

      if (!Array.isArray(questions)) {
        console.error("Parsed AI response is not an array:", questions);
        throw new AppError("AI returned invalid JSON structure", 500);
      }

      console.log("Parsed questions array length:", questions.length);
    } catch (e) {
      console.error("Failed to parse AI JSON:", e);
      throw new AppError("AI returned invalid JSON", 500);
    }

    // Transform questions to match your Mongoose schema
    const transformedQuestions = questions.map((q, index) => {
      let transformedQuestion = { ...q };
      
      // Fix 1: Convert correctAnswer array to string
      if (Array.isArray(transformedQuestion.correctAnswer)) {
        // For MCQ and short answers, take the first element
        if (transformedQuestion.type === 'mcq' || transformedQuestion.type === 'short') {
          transformedQuestion.correctAnswer = transformedQuestion.correctAnswer[0] || '';
        } 
        // For MSQ, join multiple answers with comma
        else if (transformedQuestion.type === 'msq') {
          transformedQuestion.correctAnswer = transformedQuestion.correctAnswer.join(', ');
        }
        // For scenario questions, take the first element
        else {
          transformedQuestion.correctAnswer = transformedQuestion.correctAnswer[0] || '';
        }
      }
      
      // Fix 2: Map invalid type values to valid ones
      if (transformedQuestion.type === 'msq') {
        // Map 'msq' to 'mcq' or handle differently based on your schema
        // If your schema doesn't support multiple select, convert to single select
        transformedQuestion.type = 'mcq';
      } else if (transformedQuestion.type === 'scenario') {
        // Map 'scenario' to 'short' (descriptive answer)
        transformedQuestion.type = 'short';
      }
      
      // Ensure options is always an array, even for short answers
      if (!Array.isArray(transformedQuestion.options)) {
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
      
      // More detailed error logging
      if (err.name === 'ValidationError') {
        console.error("Validation errors:", err.errors);
      }
      throw new AppError("Failed to save exam to database", 500);
    }
  }

  async getExam(id) {
    console.log("getExam called with id:", id);
    const exam = await repo.findById(id);
    console.log("Fetched exam:", exam?._id);
    if (!exam) throw new AppError("Exam not found", 404);
    return exam;
  }

  async submitExam(id, answers) {
    console.log("submitExam called with id:", id, "answers:", answers);
    const exam = await repo.findById(id);
    if (!exam) throw new AppError("Exam not found", 404);

    if (!answers || typeof answers !== "object") {
      console.error("Invalid answers type:", typeof answers);
      throw new AppError("Invalid answers format", 400);
    }

    let score = 0;
    exam.questions.forEach((q, idx) => {
      const given = answers[idx];
      
      // Handle different question types for scoring
      if (q.type === "mcq") {
        // For MCQ, compare string answers
        if (q.correctAnswer === given) score++;
      } else if (q.type === "short") {
        // For short answers, you might want to do fuzzy matching
        // For now, simple exact match
        if (q.correctAnswer?.toLowerCase().trim() === given?.toLowerCase().trim()) {
          score++;
        }
      }
      // Note: MSQ type was converted to MCQ, so we don't handle it separately
    });

    console.log("Calculated score:", score);

    const updated = await repo.updateExam(id, {
      submittedAnswers: answers,
      score,
      status: "graded"
    });

    console.log("Updated exam after submission:", updated._id);
    return updated;
  }

  async getResult(id) {
    console.log("getResult called with id:", id);
    const exam = await repo.findById(id);
    if (!exam) throw new AppError("Exam not found", 404);
    if (exam.status !== "graded") throw new AppError("Exam not graded yet", 400);

    const qualified = (exam.score / exam.questions.length) * 100 >= 70;
    const result = {
      score: exam.score,
      total: exam.questions.length,
      percentage: ((exam.score / exam.questions.length) * 100).toFixed(2),
      qualified,
      answers: exam.submittedAnswers
    };

    console.log("Exam result:", result);
    return result;
  }
}

export default ExamUseCase;