import { describe, it, expect } from "vitest";
import { FLASHCARDS, getFlashcardById, getFlashcardsByDomain } from "../src/flashcards/flashcard-data";

describe("FLASHCARDS", () => {
  it("has at least 30 cards", () => {
    expect(FLASHCARDS.length).toBeGreaterThanOrEqual(30);
  });

  it("has unique ids", () => {
    const ids = FLASHCARDS.map((fc) => fc.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each card has front and back text", () => {
    for (const fc of FLASHCARDS) {
      expect(fc.front.length).toBeGreaterThan(10);
      expect(fc.back.length).toBeGreaterThan(10);
    }
  });

  it("each card has valid domain_id (1-5)", () => {
    for (const fc of FLASHCARDS) {
      expect(fc.domain_id).toBeGreaterThanOrEqual(1);
      expect(fc.domain_id).toBeLessThanOrEqual(5);
    }
  });

  it("each card has valid task_statement_id", () => {
    for (const fc of FLASHCARDS) {
      expect(fc.task_statement_id).toMatch(/^\d\.\d+$/);
    }
  });

  it("covers all 5 domains", () => {
    const domains = new Set(FLASHCARDS.map((fc) => fc.domain_id));
    expect(domains.size).toBe(5);
  });
});

describe("getFlashcardById", () => {
  it("returns card for valid id", () => {
    const card = getFlashcardById("fc_1_1a");
    expect(card).toBeDefined();
    expect(card!.domain_id).toBe(1);
  });

  it("returns undefined for invalid id", () => {
    expect(getFlashcardById("nonexistent")).toBeUndefined();
  });
});

describe("getFlashcardsByDomain", () => {
  it("returns cards filtered by domain", () => {
    const d1 = getFlashcardsByDomain(1);
    expect(d1.length).toBeGreaterThan(0);
    for (const fc of d1) {
      expect(fc.domain_id).toBe(1);
    }
  });

  it("returns empty for invalid domain", () => {
    expect(getFlashcardsByDomain(99)).toEqual([]);
  });
});
