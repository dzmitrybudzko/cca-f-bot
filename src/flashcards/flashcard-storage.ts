import fs from "fs";
import path from "path";
import { FLASHCARDS } from "./flashcard-data";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const FLASHCARD_FILE = path.join(DATA_DIR, "flashcards.json");

const MAX_BOX = 5;

export interface CardProgress {
  box: number;
  lastReviewed: number;
  reviewCount: number;
  correctCount: number;
}

export interface UserFlashcardState {
  userId: number;
  cards: Record<string, CardProgress>;
  totalReviews: number;
}

interface FlashcardStorage {
  users: Record<string, UserFlashcardState>;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadStorage(): FlashcardStorage {
  ensureDataDir();
  if (!fs.existsSync(FLASHCARD_FILE)) {
    return { users: {} };
  }
  const raw = fs.readFileSync(FLASHCARD_FILE, "utf-8");
  return JSON.parse(raw) as FlashcardStorage;
}

function saveStorage(data: FlashcardStorage): void {
  ensureDataDir();
  fs.writeFileSync(FLASHCARD_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function loadFlashcardState(userId: number): UserFlashcardState {
  const storage = loadStorage();
  const existing = storage.users[String(userId)];
  if (existing) return existing;

  const state: UserFlashcardState = {
    userId,
    cards: {},
    totalReviews: 0,
  };
  for (const fc of FLASHCARDS) {
    state.cards[fc.id] = { box: 1, lastReviewed: 0, reviewCount: 0, correctCount: 0 };
  }
  storage.users[String(userId)] = state;
  saveStorage(storage);
  return state;
}

export function saveFlashcardState(state: UserFlashcardState): void {
  const storage = loadStorage();
  storage.users[String(state.userId)] = state;
  saveStorage(storage);
}

const BOX_INTERVALS_MS: Record<number, number> = {
  1: 0,
  2: 2 * 60 * 60 * 1000,
  3: 24 * 60 * 60 * 1000,
  4: 3 * 24 * 60 * 60 * 1000,
  5: 7 * 24 * 60 * 60 * 1000,
};

export function isDue(card: CardProgress): boolean {
  if (card.lastReviewed === 0) return true;
  const interval = BOX_INTERVALS_MS[card.box] || 0;
  return Date.now() - card.lastReviewed >= interval;
}

export function getNextCard(state: UserFlashcardState): string | null {
  const due: Array<{ id: string; box: number; lastReviewed: number }> = [];

  for (const fc of FLASHCARDS) {
    const progress = state.cards[fc.id];
    if (!progress) {
      state.cards[fc.id] = { box: 1, lastReviewed: 0, reviewCount: 0, correctCount: 0 };
      due.push({ id: fc.id, box: 1, lastReviewed: 0 });
      continue;
    }
    if (isDue(progress)) {
      due.push({ id: fc.id, box: progress.box, lastReviewed: progress.lastReviewed });
    }
  }

  if (due.length === 0) return null;

  due.sort((a, b) => {
    if (a.box !== b.box) return a.box - b.box;
    return a.lastReviewed - b.lastReviewed;
  });

  return due[0].id;
}

export function markCorrect(state: UserFlashcardState, cardId: string): void {
  const card = state.cards[cardId];
  if (!card) return;
  card.box = Math.min(card.box + 1, MAX_BOX);
  card.lastReviewed = Date.now();
  card.reviewCount++;
  card.correctCount++;
  state.totalReviews++;
}

export function markIncorrect(state: UserFlashcardState, cardId: string): void {
  const card = state.cards[cardId];
  if (!card) return;
  card.box = 1;
  card.lastReviewed = Date.now();
  card.reviewCount++;
  state.totalReviews++;
}

export function getFlashcardStats(state: UserFlashcardState): {
  total: number;
  mastered: number;
  learning: number;
  new: number;
  dueNow: number;
} {
  let mastered = 0;
  let learning = 0;
  let newCards = 0;
  let dueNow = 0;

  for (const fc of FLASHCARDS) {
    const card = state.cards[fc.id];
    if (!card || card.reviewCount === 0) {
      newCards++;
      dueNow++;
      continue;
    }
    if (card.box >= MAX_BOX) {
      mastered++;
    } else {
      learning++;
    }
    if (isDue(card)) dueNow++;
  }

  return { total: FLASHCARDS.length, mastered, learning, new: newCards, dueNow };
}
