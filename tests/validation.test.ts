import { describe, it, expect } from "vitest";
import { validateExamQuestion } from "../src/utils/validation";
import { ExamQuestion } from "../src/models/exam-question";

function validQuestion(overrides?: Partial<ExamQuestion>): ExamQuestion {
  return {
    question_text: "When building an agentic loop, what should you inspect to decide whether to continue iterating?",
    options: [
      "Check stop_reason for 'tool_use' to continue and 'end_turn' to stop",
      "Parse the assistant's text for phrases like 'I'm done'",
      "Set a fixed iteration cap of 10 loops",
      "Check if the assistant returned any text content",
    ],
    correct_index: 0,
    explanation: "The stop_reason field is the reliable signal. Parsing text is fragile. Iteration caps are secondary. Text presence doesn't indicate completion.",
    key_concept: "Agentic loop control flow",
    domain_id: 1,
    scenario_id: 1,
    task_statement_id: "1.1",
    difficulty: "medium",
    anti_patterns_in_distractors: ["AP3"],
    ...overrides,
  };
}

describe("validateExamQuestion", () => {
  it("returns no errors for a valid question", () => {
    expect(validateExamQuestion(validQuestion())).toEqual([]);
  });

  it("rejects empty question_text", () => {
    const errors = validateExamQuestion(validQuestion({ question_text: "" }));
    expect(errors).toContainEqual(expect.stringContaining("question_text"));
  });

  it("rejects question_text shorter than 20 chars", () => {
    const errors = validateExamQuestion(validQuestion({ question_text: "Short?" }));
    expect(errors).toContainEqual(expect.stringContaining("question_text"));
  });

  it("rejects fewer than 4 options", () => {
    const errors = validateExamQuestion(
      validQuestion({ options: ["A", "B", "C"] as any })
    );
    expect(errors).toContainEqual(expect.stringContaining("4 options"));
  });

  it("rejects empty option", () => {
    const errors = validateExamQuestion(
      validQuestion({ options: ["A", "", "C", "D"] as any })
    );
    expect(errors).toContainEqual(expect.stringContaining("Option 1"));
  });

  it("rejects correct_index out of range", () => {
    const errors = validateExamQuestion(validQuestion({ correct_index: 5 as any }));
    expect(errors).toContainEqual(expect.stringContaining("correct_index"));
  });

  it("rejects short explanation", () => {
    const errors = validateExamQuestion(validQuestion({ explanation: "OK" }));
    expect(errors).toContainEqual(expect.stringContaining("explanation"));
  });

  it("rejects invalid domain_id", () => {
    const errors = validateExamQuestion(validQuestion({ domain_id: 9 as any }));
    expect(errors).toContainEqual(expect.stringContaining("domain_id"));
  });

  it("rejects invalid scenario_id", () => {
    const errors = validateExamQuestion(validQuestion({ scenario_id: 0 as any }));
    expect(errors).toContainEqual(expect.stringContaining("scenario_id"));
  });

  it("rejects invalid difficulty", () => {
    const errors = validateExamQuestion(validQuestion({ difficulty: "extreme" as any }));
    expect(errors).toContainEqual(expect.stringContaining("difficulty"));
  });

  it("collects multiple errors at once", () => {
    const errors = validateExamQuestion(
      validQuestion({ question_text: "", explanation: "", domain_id: 0 as any })
    );
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});
