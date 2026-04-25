import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";

const TEST_DATA_DIR = path.join(process.cwd(), "data-test-flashcards");

describe("flashcard-storage", () => {
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

  it("creates state with all cards in box 1", async () => {
    const mod = await import("../src/flashcards/flashcard-storage");
    const { FLASHCARDS } = await import("../src/flashcards/flashcard-data");
    const state = mod.loadFlashcardState(1);
    expect(state.userId).toBe(1);
    expect(Object.keys(state.cards).length).toBe(FLASHCARDS.length);
    for (const card of Object.values(state.cards)) {
      expect(card.box).toBe(1);
      expect(card.lastReviewed).toBe(0);
    }
  });

  it("getNextCard returns a card for fresh state", async () => {
    const mod = await import("../src/flashcards/flashcard-storage");
    const state = mod.loadFlashcardState(1);
    const cardId = mod.getNextCard(state);
    expect(cardId).not.toBeNull();
  });

  it("markCorrect moves card to next box", async () => {
    const mod = await import("../src/flashcards/flashcard-storage");
    const state = mod.loadFlashcardState(1);
    const cardId = mod.getNextCard(state)!;

    mod.markCorrect(state, cardId);
    expect(state.cards[cardId].box).toBe(2);
    expect(state.cards[cardId].reviewCount).toBe(1);
    expect(state.cards[cardId].correctCount).toBe(1);
    expect(state.totalReviews).toBe(1);
  });

  it("markIncorrect resets card to box 1", async () => {
    const mod = await import("../src/flashcards/flashcard-storage");
    const state = mod.loadFlashcardState(1);
    const cardId = mod.getNextCard(state)!;

    mod.markCorrect(state, cardId);
    mod.markCorrect(state, cardId);
    expect(state.cards[cardId].box).toBe(3);

    mod.markIncorrect(state, cardId);
    expect(state.cards[cardId].box).toBe(1);
    expect(state.cards[cardId].reviewCount).toBe(3);
    expect(state.cards[cardId].correctCount).toBe(2);
  });

  it("markCorrect caps at box 5", async () => {
    const mod = await import("../src/flashcards/flashcard-storage");
    const state = mod.loadFlashcardState(1);
    const cardId = mod.getNextCard(state)!;

    for (let i = 0; i < 10; i++) {
      mod.markCorrect(state, cardId);
    }
    expect(state.cards[cardId].box).toBe(5);
  });

  it("isDue returns true for never-reviewed cards", async () => {
    const mod = await import("../src/flashcards/flashcard-storage");
    expect(mod.isDue({ box: 1, lastReviewed: 0, reviewCount: 0, correctCount: 0 })).toBe(true);
  });

  it("isDue returns false for recently reviewed box 2 card", async () => {
    const mod = await import("../src/flashcards/flashcard-storage");
    expect(mod.isDue({ box: 2, lastReviewed: Date.now(), reviewCount: 1, correctCount: 1 })).toBe(false);
  });

  it("isDue returns true for box 2 card reviewed 3+ hours ago", async () => {
    const mod = await import("../src/flashcards/flashcard-storage");
    const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;
    expect(mod.isDue({ box: 2, lastReviewed: threeHoursAgo, reviewCount: 1, correctCount: 1 })).toBe(true);
  });

  it("getFlashcardStats counts correctly", async () => {
    const mod = await import("../src/flashcards/flashcard-storage");
    const { FLASHCARDS } = await import("../src/flashcards/flashcard-data");
    const state = mod.loadFlashcardState(1);
    const stats = mod.getFlashcardStats(state);

    expect(stats.total).toBe(FLASHCARDS.length);
    expect(stats.new).toBe(FLASHCARDS.length);
    expect(stats.mastered).toBe(0);
    expect(stats.learning).toBe(0);
    expect(stats.dueNow).toBe(FLASHCARDS.length);
  });

  it("saves and reloads state", async () => {
    const mod = await import("../src/flashcards/flashcard-storage");
    const state = mod.loadFlashcardState(42);
    const cardId = mod.getNextCard(state)!;
    mod.markCorrect(state, cardId);
    mod.saveFlashcardState(state);

    const reloaded = mod.loadFlashcardState(42);
    expect(reloaded.cards[cardId].box).toBe(2);
    expect(reloaded.totalReviews).toBe(1);
  });

  it("getNextCard prioritizes lower boxes", async () => {
    const mod = await import("../src/flashcards/flashcard-storage");
    const { FLASHCARDS } = await import("../src/flashcards/flashcard-data");
    const state = mod.loadFlashcardState(1);

    // Move first card to box 3
    const firstId = FLASHCARDS[0].id;
    state.cards[firstId].box = 3;
    state.cards[firstId].lastReviewed = Date.now() - 2 * 24 * 60 * 60 * 1000;
    state.cards[firstId].reviewCount = 2;

    // Second card stays in box 1
    const nextId = mod.getNextCard(state);
    expect(nextId).not.toBe(firstId);
  });
});
