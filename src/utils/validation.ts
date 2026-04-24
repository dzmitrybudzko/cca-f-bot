import { ExamQuestion } from "../models/exam-question";

export function validateExamQuestion(question: ExamQuestion): string[] {
  const errors: string[] = [];

  if (!question.question_text || question.question_text.trim().length < 20) {
    errors.push("question_text must be at least 20 characters");
  }

  if (!Array.isArray(question.options) || question.options.length !== 4) {
    errors.push("Must have exactly 4 options");
  } else {
    for (let i = 0; i < 4; i++) {
      if (!question.options[i] || question.options[i].trim().length === 0) {
        errors.push(`Option ${i} is empty`);
      }
    }
  }

  if (![0, 1, 2, 3].includes(question.correct_index)) {
    errors.push("correct_index must be 0, 1, 2, or 3");
  }

  if (!question.explanation || question.explanation.trim().length < 20) {
    errors.push("explanation must be at least 20 characters");
  }

  if (![1, 2, 3, 4, 5].includes(question.domain_id)) {
    errors.push("domain_id must be 1-5");
  }

  if (![1, 2, 3, 4, 5, 6].includes(question.scenario_id)) {
    errors.push("scenario_id must be 1-6");
  }

  if (!["easy", "medium", "hard"].includes(question.difficulty)) {
    errors.push("difficulty must be easy, medium, or hard");
  }

  return errors;
}
