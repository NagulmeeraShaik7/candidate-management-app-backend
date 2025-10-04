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

  // NEW: Get all results with filtering and pagination
  async getAllResults({ page = 1, limit = 10, candidateId, status, qualified }) {
    console.log("getAllResults called with filters:", { page, limit, candidateId, status, qualified });

    const result = await repo.findAllExams({
      page,
      limit,
      candidateId,
      status,
      qualified
    });

    // Transform the data to include calculated fields
    const transformedExams = result.exams.map(exam => {
      const percentage = (exam.score / exam.questions.length) * 100;
      const finalPercentage = exam.finalScore ? 
        (exam.finalScore / exam.questions.length) * 100 : percentage;
      
      return {
        _id: exam._id,
        candidate: {
          _id: exam.candidateId._id,
          name: exam.candidateId.name,
          email: exam.candidateId.email,
          experience: exam.candidateId.experience,
          skills: exam.candidateId.skills,
          qualification: exam.candidateId.highestqualification
        },
        score: exam.score,
        manualScore: exam.manualScore,
        finalScore: exam.finalScore || exam.score,
        totalQuestions: exam.questions.length,
        percentage: percentage.toFixed(2),
        finalPercentage: finalPercentage.toFixed(2),
        qualified: finalPercentage >= 70,
        status: exam.status,
        generatedAt: exam.generatedAt,
        submittedAt: exam.submittedAt,
        gradedAt: exam.gradedAt,
        reviewedAt: exam.reviewedAt
      };
    });

    return {
      exams: transformedExams,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    };
  }

  // NEW: Get detailed exam for admin review
  async getExamForReview(id) {
    console.log("getExamForReview called with id:", id);
    
    const exam = await repo.findById(id);
    if (!exam) throw new AppError("Exam not found", 404, "NotFoundError");

    if (exam.status === "generated") {
      throw new AppError("Exam not submitted yet", 400, "NotSubmittedError");
    }

    // Prepare detailed review data
    const reviewData = {
      _id: exam._id,
      candidate: {
        _id: exam.candidateId._id,
        name: exam.candidateId.name,
        email: exam.candidateId.email,
        experience: exam.candidateId.experience,
        skills: exam.candidateId.skills,
        qualification: exam.candidateId.highestqualification
      },
      questions: exam.questions.map((question, index) => {
        const submittedAnswer = exam.submittedAnswers.get(index.toString());
        const isAutoGraded = ["mcq", "msq"].includes(question.type);
        const isCorrect = isAutoGraded ? isAnswerCorrect(question, submittedAnswer) : null;
        const manualGrade = exam.manualGrading?.find(g => g.questionId.equals(question._id));

        return {
          _id: question._id,
          index,
          question: question.question,
          type: question.type,
          options: question.options,
          correctAnswer: question.correctAnswer,
          submittedAnswer: submittedAnswer,
          isAutoGraded,
          autoGradedCorrect: isCorrect,
          manualScore: manualGrade?.score || null,
          manualFeedback: manualGrade?.feedback || null,
          needsManualReview: !isAutoGraded && !manualGrade
        };
      }),
      scores: {
        autoScore: exam.score,
        manualScore: exam.manualScore,
        finalScore: exam.finalScore || exam.score,
        totalQuestions: exam.questions.length,
        autoPercentage: (exam.score / exam.questions.length * 100).toFixed(2),
        finalPercentage: exam.finalScore ? 
          (exam.finalScore / exam.questions.length * 100).toFixed(2) : 
          (exam.score / exam.questions.length * 100).toFixed(2)
      },
      status: exam.status,
      timestamps: {
        generatedAt: exam.generatedAt,
        submittedAt: exam.submittedAt,
        gradedAt: exam.gradedAt,
        reviewedAt: exam.reviewedAt
      }
    };

    return reviewData;
  }

  // NEW: Manual grading for descriptive answers
  async manualGrading(examId, questionId, score, feedback = "") {
    console.log("manualGrading called:", { examId, questionId, score, feedback });

    if (score < 0 || score > 1) {
      throw new AppError("Score must be between 0 and 1", 400, "ValidationError");
    }

    const exam = await repo.findById(examId);
    if (!exam) throw new AppError("Exam not found", 404, "NotFoundError");

    if (exam.status === "generated") {
      throw new AppError("Exam not submitted yet", 400, "NotSubmittedError");
    }

    // Find the question
    const question = exam.questions.id(questionId);
    if (!question) {
      throw new AppError("Question not found in exam", 404, "NotFoundError");
    }

    // Check if question type requires manual grading
    if (["mcq", "msq"].includes(question.type)) {
      throw new AppError("Auto-graded questions cannot be manually graded", 400, "ValidationError");
    }

    // Prepare manual grading data
    const manualGradingData = exam.manualGrading || [];
    const existingGradeIndex = manualGradingData.findIndex(g => g.questionId.equals(questionId));

    const gradeData = {
      questionId,
      score,
      feedback,
      gradedBy: "admin", // In real app, use actual admin user ID
      gradedAt: new Date()
    };

    if (existingGradeIndex >= 0) {
      manualGradingData[existingGradeIndex] = gradeData;
    } else {
      manualGradingData.push(gradeData);
    }

    // Calculate new scores
    let manualScore = 0;
    manualGradingData.forEach(grade => {
      manualScore += grade.score;
    });

    const autoGradedQuestions = exam.questions.filter(q => ["mcq", "msq"].includes(q.type));
    const autoScore = exam.score || 0;

    const finalScore = autoScore + manualScore;

    // Update exam with manual grading
    const updatedExam = await repo.updateManualGrading(examId, {
      manualGrading: manualGradingData,
      manualScore,
      finalScore,
      status: 'manually_graded',
      reviewedAt: new Date()
    });

    console.log("Manual grading completed. Final score:", finalScore);
    return updatedExam;
  }

  // NEW: Get candidate's exam history
  async getCandidateExams(candidateId) {
    console.log("getCandidateExams called with candidateId:", candidateId);

    if (!mongoose.isValidObjectId(candidateId)) {
      throw new AppError("Invalid candidate ID", 400, "ValidationError");
    }

    const exams = await repo.findByCandidateId(candidateId);
    
    const transformedExams = exams.map(exam => {
      const percentage = (exam.score / exam.questions.length) * 100;
      const finalPercentage = exam.finalScore ? 
        (exam.finalScore / exam.questions.length) * 100 : percentage;

      return {
        _id: exam._id,
        score: exam.score,
        finalScore: exam.finalScore || exam.score,
        totalQuestions: exam.questions.length,
        percentage: percentage.toFixed(2),
        finalPercentage: finalPercentage.toFixed(2),
        qualified: finalPercentage >= 70,
        status: exam.status,
        generatedAt: exam.generatedAt,
        submittedAt: exam.submittedAt,
        gradedAt: exam.gradedAt
      };
    });

    return transformedExams;
  }
}

export default ExamUseCase;