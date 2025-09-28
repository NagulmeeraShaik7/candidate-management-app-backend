// utils/exam.utils.js

/**
 * ✅ Utility functions for exam operations
 */

// ---------------------------
// QUESTION VALIDATION
// ---------------------------

export function validateQuestion(question) {
  if (!question || typeof question !== "object") return false;
  if (typeof question.question !== "string" || !question.question.trim()) return false;
  if (!["mcq", "msq", "short", "descriptive"].includes(question.type)) return false;

  if (["mcq", "msq"].includes(question.type)) {
    if (!Array.isArray(question.options) || question.options.length < 2) return false;
  }

  // For MCQ, correctAnswer should be string
  if (question.type === "mcq" && typeof question.correctAnswer !== "string") return false;
  
  // For MSQ, correctAnswer should be array
  if (question.type === "msq" && !Array.isArray(question.correctAnswer)) return false;

  return true;
}

// ---------------------------
// ANSWER VALIDATION
// ---------------------------

export function validateSubmittedAnswers(answers, questions) {
  console.log("Validating answers:", answers);
  console.log("Questions count:", questions.length);

  if (!answers || typeof answers !== "object") {
    console.error("Answers is not an object:", answers);
    return false;
  }

  // Check if we have answers for all questions
  const answerKeys = Object.keys(answers);
  console.log("Answer keys:", answerKeys);

  if (answerKeys.length !== questions.length) {
    console.error(`Answers count (${answerKeys.length}) doesn't match questions count (${questions.length})`);
    return false;
  }

  // Validate each answer against its corresponding question
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const answerKey = i.toString();
    const givenAnswer = answers[answerKey];

    console.log(`Validating Q${i} (type: ${question.type}):`, givenAnswer);

    if (!question) {
      console.error(`No question found at index ${i}`);
      return false;
    }

    if (givenAnswer === undefined || givenAnswer === null) {
      console.error(`No answer provided for question ${i}`);
      return false;
    }

    // Validate based on question type with smart type detection
    const validationResult = validateAnswerType(question, givenAnswer, i);
    if (!validationResult.valid) {
      console.error(`Answer validation failed for Q${i}:`, validationResult.message);
      return false;
    }
  }

  console.log("All answers validated successfully");
  return true;
}

// ---------------------------
// SMART ANSWER TYPE VALIDATION
// ---------------------------

function validateAnswerType(question, givenAnswer, index) {
  // Handle type mismatches intelligently
  if (question.type === "mcq" && Array.isArray(givenAnswer)) {
    // If MCQ but got array, check if it's actually MSQ
    if (Array.isArray(question.correctAnswer)) {
      console.log(`⚠️  Question ${index} marked as MCQ but has array correctAnswer - treating as MSQ`);
      return { valid: true, message: "Auto-converted MCQ to MSQ" };
    }
    return { 
      valid: false, 
      message: `MCQ question expects string answer but got array` 
    };
  }

  if (question.type === "msq" && typeof givenAnswer === "string") {
    console.log(`⚠️  Question ${index} marked as MSQ but got string answer - treating as MCQ`);
    return { valid: true, message: "Auto-converted MSQ to MCQ" };
  }

  // Standard validation
  switch (question.type) {
    case "mcq":
      if (typeof givenAnswer !== "string") {
        return { 
          valid: false, 
          message: `MCQ answer must be a string` 
        };
      }
      break;
      
    case "msq":
      if (!Array.isArray(givenAnswer)) {
        return { 
          valid: false, 
          message: `MSQ answer must be an array` 
        };
      }
      break;
      
    case "short":
    case "descriptive":
      if (typeof givenAnswer !== "string") {
        return { 
          valid: false, 
          message: `Short/Descriptive answer must be a string` 
        };
      }
      break;
      
    default:
      return { 
        valid: false, 
        message: `Unknown question type: ${question.type}` 
      };
  }

  return { valid: true, message: "Valid answer" };
}

// ---------------------------
// ANSWER EVALUATION
// ---------------------------

export function isAnswerCorrect(question, givenAnswer) {
  if (!question || givenAnswer === undefined || givenAnswer === null) {
    return false;
  }

  console.log(`Evaluating answer for question type ${question.type}:`, {
    given: givenAnswer,
    correct: question.correctAnswer
  });

  // Smart type handling for evaluation
  let actualType = question.type;
  
  if (question.type === "mcq" && Array.isArray(givenAnswer) && Array.isArray(question.correctAnswer)) {
    console.log("Auto-converting MCQ to MSQ for evaluation");
    actualType = "msq";
  }
  
  if (question.type === "msq" && typeof givenAnswer === "string" && typeof question.correctAnswer === "string") {
    console.log("Auto-converting MSQ to MCQ for evaluation");
    actualType = "mcq";
  }

  switch (actualType) {
    case "mcq":
      const result = normalizeString(givenAnswer) === normalizeString(question.correctAnswer);
      console.log(`MCQ evaluation: ${result}`);
      return result;

    case "msq":
      if (!Array.isArray(givenAnswer) || !Array.isArray(question.correctAnswer)) {
        console.log("MSQ evaluation failed: invalid arrays");
        return false;
      }
      
      const normalizedGiven = givenAnswer.map(a => normalizeString(a));
      const normalizedCorrect = question.correctAnswer.map(a => normalizeString(a));
      
      const userSet = new Set(normalizedGiven);
      const correctSet = new Set(normalizedCorrect);
      
      const msqResult = userSet.size === correctSet.size && 
                       [...userSet].every(a => correctSet.has(a));
      console.log(`MSQ evaluation: ${msqResult}`);
      return msqResult;

    case "short":
    case "descriptive":
      const relevanceResult = isRelevantAnswer(givenAnswer, question.correctAnswer);
      console.log(`Short/Descriptive evaluation: ${relevanceResult}`);
      return relevanceResult;

    default:
      console.log("Unknown question type, evaluation failed");
      return false;
  }
}

// ---------------------------
// RELEVANCE CHECK FOR SHORT/DESCRIPTIVE
// ---------------------------

function isRelevantAnswer(userAnswer, correctAnswer) {
  if (!userAnswer || !correctAnswer) return false;

  const ua = normalizeString(userAnswer);
  const ca = normalizeString(correctAnswer);

  // 1️⃣ Exact match
  if (ua === ca) {
    console.log("Exact match found");
    return true;
  }

  // 2️⃣ Keyword match (≥50% keywords)
  const caKeywords = ca.split(/\s+/).filter(w => w.length > 3);
  if (caKeywords.length > 0) {
    const matched = caKeywords.filter(kw => ua.includes(kw));
    const keywordMatch = matched.length / caKeywords.length >= 0.5;
    if (keywordMatch) {
      console.log("Keyword match found:", matched);
      return true;
    }
  }

  // 3️⃣ Fuzzy similarity (Levenshtein)
  const distance = levenshteinDistance(ua, ca);
  const similarity = 1 - distance / Math.max(ua.length, ca.length);
  const fuzzyMatch = similarity >= 0.7;
  
  console.log(`Fuzzy similarity: ${similarity.toFixed(2)} (${fuzzyMatch ? 'match' : 'no match'})`);
  return fuzzyMatch;
}

function normalizeString(str) {
  return (str || "").toString().trim().toLowerCase().replace(/\s+/g, ' ');
}

// ---------------------------
// LEVENSHTEIN DISTANCE
// ---------------------------

function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[b.length][a.length];
}

// ---------------------------
// ATTEMPT VALIDATION
// ---------------------------

export function canAttemptExam(lastExamDate, currentDate = new Date()) {
  if (!lastExamDate) return true;
  const last = new Date(lastExamDate);
  const diffDays = (currentDate - last) / (1000 * 60 * 60 * 24);
  return diffDays >= 10;
}