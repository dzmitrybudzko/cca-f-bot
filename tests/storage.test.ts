import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  createStoredUserProgress,
  hashQuestion,
  wasQuestionAsked,
  ensureActiveSession,
  updateCurrentSession,
  startSession,
  getTimeSinceLastSession,
  loadUserProgress,
  saveUserProgress,
} from "../src/utils/storage";

const TEST_DATA_DIR = path.join(process.cwd(), "data-test-storage");

describe("hashQuestion", () => {
  it("returns a string hash", () => {
    const hash = hashQuestion("What is X?", ["A", "B", "C", "D"]);
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
  });

  it("returns the same hash for same input", () => {
    const a = hashQuestion("Question?", ["A", "B", "C", "D"]);
    const b = hashQuestion("Question?", ["A", "B", "C", "D"]);
    expect(a).toBe(b);
  });

  it("returns different hashes for different questions", () => {
    const a = hashQuestion("Question 1?", ["A", "B", "C", "D"]);
    const b = hashQuestion("Question 2?", ["A", "B", "C", "D"]);
    expect(a).not.toBe(b);
  });

  it("returns different hashes for different options", () => {
    const a = hashQuestion("Q?", ["A", "B", "C", "D"]);
    const b = hashQuestion("Q?", ["A", "B", "C", "E"]);
    expect(a).not.toBe(b);
  });
});

describe("wasQuestionAsked", () => {
  it("returns false for fresh progress", () => {
    const p = createStoredUserProgress(1);
    expect(wasQuestionAsked(p, "somehash")).toBe(false);
  });

  it("returns true when hash exists in history", () => {
    const p = createStoredUserProgress(1);
    p.history.push({
      domain_id: 1,
      scenario_id: 1,
      task_statement_id: "1.1",
      correct: true,
      difficulty: "easy",
      timestamp: Date.now(),
      question_hash: "abc123",
    });
    expect(wasQuestionAsked(p, "abc123")).toBe(true);
  });

  it("returns false for different hash", () => {
    const p = createStoredUserProgress(1);
    p.history.push({
      domain_id: 1,
      scenario_id: 1,
      task_statement_id: "1.1",
      correct: true,
      difficulty: "easy",
      timestamp: Date.now(),
      question_hash: "abc123",
    });
    expect(wasQuestionAsked(p, "xyz789")).toBe(false);
  });
});

describe("createStoredUserProgress", () => {
  it("creates progress with all 5 domains initialized", () => {
    const p = createStoredUserProgress(42);
    expect(p.userId).toBe(42);
    for (let d = 1; d <= 5; d++) {
      expect(p.domainStats[String(d)]).toEqual({ correct: 0, total: 0 });
    }
  });

  it("starts with empty history and sessions", () => {
    const p = createStoredUserProgress(1);
    expect(p.history).toEqual([]);
    expect(p.sessions).toEqual([]);
  });

  it("starts with easy difficulty", () => {
    const p = createStoredUserProgress(1);
    expect(p.currentDifficulty).toBe("easy");
  });
});

describe("session management", () => {
  it("startSession adds a new session", () => {
    const p = createStoredUserProgress(1);
    expect(p.sessions.length).toBe(0);
    startSession(p);
    expect(p.sessions.length).toBe(1);
    expect(p.sessions[0].questionsAnswered).toBe(0);
  });

  it("updateCurrentSession increments question count", () => {
    const p = createStoredUserProgress(1);
    startSession(p);
    updateCurrentSession(p);
    expect(p.sessions[0].questionsAnswered).toBe(1);
    updateCurrentSession(p);
    expect(p.sessions[0].questionsAnswered).toBe(2);
  });

  it("updateCurrentSession creates session if none exists", () => {
    const p = createStoredUserProgress(1);
    updateCurrentSession(p);
    expect(p.sessions.length).toBe(1);
  });

  it("ensureActiveSession creates a new session for fresh progress", () => {
    const p = createStoredUserProgress(1);
    ensureActiveSession(p);
    expect(p.sessions.length).toBe(1);
  });

  it("ensureActiveSession doesn't create duplicate for active session", () => {
    const p = createStoredUserProgress(1);
    startSession(p);
    ensureActiveSession(p);
    expect(p.sessions.length).toBe(1);
  });

  it("ensureActiveSession creates new session after 30+ min gap", () => {
    const p = createStoredUserProgress(1);
    startSession(p);
    // Fake the session ending 31 minutes ago
    p.sessions[0].endedAt = Date.now() - 31 * 60 * 1000;
    ensureActiveSession(p);
    expect(p.sessions.length).toBe(2);
  });
});

describe("getTimeSinceLastSession", () => {
  it("returns null for no sessions", () => {
    const p = createStoredUserProgress(1);
    expect(getTimeSinceLastSession(p)).toBeNull();
  });

  it("returns time since last session ended", () => {
    const p = createStoredUserProgress(1);
    startSession(p);
    const gap = getTimeSinceLastSession(p);
    expect(gap).not.toBeNull();
    expect(gap!).toBeLessThan(1000);
  });
});

describe("loadUserProgress / saveUserProgress", () => {
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

  it("returns null for non-existent user", async () => {
    // Re-import to pick up new DATA_DIR
    const mod = await import("../src/utils/storage");
    const result = mod.loadUserProgress(999);
    expect(result).toBeNull();
  });

  it("saves and loads user progress", async () => {
    const mod = await import("../src/utils/storage");
    const p = mod.createStoredUserProgress(42);
    p.domainStats["1"] = { correct: 5, total: 10 };
    mod.saveUserProgress(p);

    const loaded = mod.loadUserProgress(42);
    expect(loaded).not.toBeNull();
    expect(loaded!.userId).toBe(42);
    expect(loaded!.domainStats["1"]).toEqual({ correct: 5, total: 10 });
  });
});
