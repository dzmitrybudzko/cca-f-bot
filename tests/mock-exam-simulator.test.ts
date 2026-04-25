import { describe, it, expect } from "vitest";
import { MockExamSimulator, MockExamResult } from "../src/agents/mock-exam-simulator";
import { ExamQuestion } from "../src/models/exam-question";

function makeQuestion(domainId: number, idx: number): ExamQuestion {
  return {
    question_text: `Question ${idx} for domain ${domainId}`,
    options: ["A", "B", "C", "D"],
    correct_index: 0,
    explanation: "A is correct because it follows best practices.",
    key_concept: "test",
    domain_id: domainId as 1 | 2 | 3 | 4 | 5,
    scenario_id: 1,
    task_statement_id: `${domainId}.1`,
    difficulty: "medium",
    anti_patterns_in_distractors: [],
  };
}

function makeResult(questionCount: number): MockExamResult {
  const questions: ExamQuestion[] = [];
  for (let i = 0; i < questionCount; i++) {
    questions.push(makeQuestion(((i % 5) + 1), i));
  }
  return {
    questions,
    answers: new Array(questionCount).fill(null),
    correct: 0,
    total: questionCount,
    scaledScore: 0,
    domainBreakdown: [
      { domainId: 1, domainName: "D1", correct: 0, total: 2, percentage: 0 },
      { domainId: 2, domainName: "D2", correct: 0, total: 2, percentage: 0 },
      { domainId: 3, domainName: "D3", correct: 0, total: 2, percentage: 0 },
      { domainId: 4, domainName: "D4", correct: 0, total: 2, percentage: 0 },
      { domainId: 5, domainName: "D5", correct: 0, total: 2, percentage: 0 },
    ],
    startTime: Date.now(),
    endTime: null,
  };
}

describe("MockExamSimulator.submitAnswer", () => {
  it("returns true for correct answer", () => {
    const result = makeResult(5);
    const isCorrect = MockExamSimulator.submitAnswer(result, 0, 0);
    expect(isCorrect).toBe(true);
    expect(result.correct).toBe(1);
    expect(result.answers[0]).toBe(0);
  });

  it("returns false for incorrect answer", () => {
    const result = makeResult(5);
    const isCorrect = MockExamSimulator.submitAnswer(result, 0, 2);
    expect(isCorrect).toBe(false);
    expect(result.correct).toBe(0);
    expect(result.answers[0]).toBe(2);
  });

  it("increments domain correct count", () => {
    const result = makeResult(5);
    // Question 0 is domain 1
    MockExamSimulator.submitAnswer(result, 0, 0);
    const d1 = result.domainBreakdown.find((d) => d.domainId === 1);
    expect(d1!.correct).toBe(1);
  });

  it("returns false for invalid question index", () => {
    const result = makeResult(5);
    const isCorrect = MockExamSimulator.submitAnswer(result, 99, 0);
    expect(isCorrect).toBe(false);
  });

  it("tracks multiple answers", () => {
    const result = makeResult(5);
    MockExamSimulator.submitAnswer(result, 0, 0); // correct
    MockExamSimulator.submitAnswer(result, 1, 0); // correct
    MockExamSimulator.submitAnswer(result, 2, 3); // incorrect
    expect(result.correct).toBe(2);
    expect(result.answers).toEqual([0, 0, 3, null, null]);
  });
});

describe("MockExamSimulator.finalize", () => {
  it("calculates scaled score", () => {
    const result = makeResult(10);
    for (let i = 0; i < 10; i++) {
      MockExamSimulator.submitAnswer(result, i, 0); // all correct
    }
    MockExamSimulator.finalize(result);
    expect(result.scaledScore).toBe(1000);
    expect(result.endTime).not.toBeNull();
  });

  it("calculates score 100 for all wrong", () => {
    const result = makeResult(10);
    for (let i = 0; i < 10; i++) {
      MockExamSimulator.submitAnswer(result, i, 3); // all wrong
    }
    MockExamSimulator.finalize(result);
    expect(result.scaledScore).toBe(100);
  });

  it("calculates domain percentages", () => {
    const result = makeResult(10);
    // Answer first 5 correctly (domains 1-5), rest wrong
    for (let i = 0; i < 5; i++) {
      MockExamSimulator.submitAnswer(result, i, 0);
    }
    for (let i = 5; i < 10; i++) {
      MockExamSimulator.submitAnswer(result, i, 3);
    }
    MockExamSimulator.finalize(result);

    for (const entry of result.domainBreakdown) {
      expect(entry.percentage).toBeDefined();
      expect(entry.percentage).toBeGreaterThanOrEqual(0);
      expect(entry.percentage).toBeLessThanOrEqual(100);
    }
  });
});

describe("MockExamSimulator.formatResults", () => {
  it("includes score and pass/fail", () => {
    const result = makeResult(10);
    for (let i = 0; i < 10; i++) {
      MockExamSimulator.submitAnswer(result, i, 0);
    }
    MockExamSimulator.finalize(result);
    const text = MockExamSimulator.formatResults(result);
    expect(text).toContain("1000");
    expect(text).toContain("PASS");
  });

  it("shows FAIL for low score", () => {
    const result = makeResult(10);
    for (let i = 0; i < 10; i++) {
      MockExamSimulator.submitAnswer(result, i, 3);
    }
    MockExamSimulator.finalize(result);
    const text = MockExamSimulator.formatResults(result);
    expect(text).toContain("FAIL");
  });

  it("includes domain breakdown", () => {
    const result = makeResult(10);
    MockExamSimulator.finalize(result);
    const text = MockExamSimulator.formatResults(result);
    expect(text).toContain("Domain Breakdown");
    expect(text).toContain("D1");
    expect(text).toContain("D5");
  });

  it("includes time when endTime is set", () => {
    const result = makeResult(10);
    result.startTime = Date.now() - 5 * 60 * 1000;
    MockExamSimulator.finalize(result);
    const text = MockExamSimulator.formatResults(result);
    expect(text).toContain("Time:");
  });
});
