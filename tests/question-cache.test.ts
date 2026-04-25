import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";

const TEST_DATA_DIR = path.join(process.cwd(), "data-test-cache");

describe("question-cache", () => {
  const origEnv = process.env.DATA_DIR;

  beforeEach(() => {
    process.env.DATA_DIR = TEST_DATA_DIR;
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DATA_DIR)) {
      fs.rmSync(TEST_DATA_DIR, { recursive: true });
    }
    if (origEnv === undefined) {
      delete process.env.DATA_DIR;
    } else {
      process.env.DATA_DIR = origEnv;
    }
  });

  function makeQuestion(domainId: number, difficulty: string, text: string) {
    return {
      question_text: text,
      options: ["A", "B", "C", "D"] as [string, string, string, string],
      correct_index: 0 as const,
      explanation: "Because A is correct and others are not.",
      key_concept: "test",
      domain_id: domainId as 1 | 2 | 3 | 4 | 5,
      scenario_id: 1 as const,
      task_statement_id: `${domainId}.1`,
      difficulty: difficulty as "easy" | "medium" | "hard",
      anti_patterns_in_distractors: [],
    };
  }

  it("returns null from empty cache", async () => {
    const mod = await import("../src/utils/question-cache");
    const q = mod.getCachedQuestion(1, "easy", new Set());
    expect(q).toBeNull();
  });

  it("getCacheSize returns 0 for empty cache", async () => {
    const mod = await import("../src/utils/question-cache");
    expect(mod.getCacheSize()).toBe(0);
  });

  it("needsRefill returns true for empty cache", async () => {
    const mod = await import("../src/utils/question-cache");
    expect(mod.needsRefill()).toBe(true);
  });

  it("adds and retrieves questions", async () => {
    const mod = await import("../src/utils/question-cache");
    const q = makeQuestion(1, "easy", "What is the agentic loop?");
    mod.addToCache([q]);
    expect(mod.getCacheSize()).toBe(1);

    const retrieved = mod.getCachedQuestion(1, "easy", new Set());
    expect(retrieved).not.toBeNull();
    expect(retrieved!.question_text).toBe("What is the agentic loop?");
    expect(mod.getCacheSize()).toBe(0);
  });

  it("filters by domain", async () => {
    const mod = await import("../src/utils/question-cache");
    mod.addToCache([makeQuestion(2, "easy", "D2 question")]);

    const retrieved = mod.getCachedQuestion(1, "easy", new Set());
    expect(retrieved).toBeNull();

    const retrieved2 = mod.getCachedQuestion(2, "easy", new Set());
    expect(retrieved2).not.toBeNull();
  });

  it("filters by difficulty", async () => {
    const mod = await import("../src/utils/question-cache");
    mod.addToCache([makeQuestion(1, "hard", "Hard question")]);

    const retrieved = mod.getCachedQuestion(1, "easy", new Set());
    expect(retrieved).toBeNull();

    const retrieved2 = mod.getCachedQuestion(1, "hard", new Set());
    expect(retrieved2).not.toBeNull();
  });

  it("excludes by hash", async () => {
    const mod = await import("../src/utils/question-cache");
    const q = makeQuestion(1, "easy", "Repeated question");
    mod.addToCache([q]);

    // Compute the hash the same way the cache does
    const hashText = q.question_text + q.options.join("|");
    let hash = 0;
    for (let i = 0; i < hashText.length; i++) {
      hash = (hash << 5) - hash + hashText.charCodeAt(i);
      hash |= 0;
    }
    const hashStr = Math.abs(hash).toString(36);

    const retrieved = mod.getCachedQuestion(1, "easy", new Set([hashStr]));
    expect(retrieved).toBeNull();
    expect(mod.getCacheSize()).toBe(1);
  });

  it("adds multiple questions in batch", async () => {
    const mod = await import("../src/utils/question-cache");
    mod.addToCache([
      makeQuestion(1, "easy", "Q1"),
      makeQuestion(2, "medium", "Q2"),
      makeQuestion(3, "hard", "Q3"),
    ]);
    expect(mod.getCacheSize()).toBe(3);
  });
});
