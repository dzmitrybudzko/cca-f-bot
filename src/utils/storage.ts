import fs from "fs";
import path from "path";
import { Difficulty } from "../models/exam-question";

const DATA_DIR = path.join(process.cwd(), "data");
const PROGRESS_FILE = path.join(DATA_DIR, "progress.json");

export interface StoredAnswerRecord {
  domain_id: number;
  scenario_id: number;
  task_statement_id: string;
  correct: boolean;
  difficulty: Difficulty;
  timestamp: number;
  question_hash: string;
}

export interface StoredSession {
  startedAt: number;
  endedAt: number;
  questionsAnswered: number;
}

export interface StoredDomainStats {
  correct: number;
  total: number;
}

export interface StoredUserProgress {
  userId: number;
  domainStats: Record<string, StoredDomainStats>;
  history: StoredAnswerRecord[];
  sessions: StoredSession[];
  currentDifficulty: Difficulty;
  lastActiveAt: number;
  createdAt: number;
}

interface StorageData {
  users: Record<string, StoredUserProgress>;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadData(): StorageData {
  ensureDataDir();
  if (!fs.existsSync(PROGRESS_FILE)) {
    return { users: {} };
  }
  const raw = fs.readFileSync(PROGRESS_FILE, "utf-8");
  return JSON.parse(raw) as StorageData;
}

function saveData(data: StorageData): void {
  ensureDataDir();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export function loadUserProgress(userId: number): StoredUserProgress | null {
  const data = loadData();
  return data.users[String(userId)] || null;
}

export function saveUserProgress(progress: StoredUserProgress): void {
  const data = loadData();
  data.users[String(progress.userId)] = progress;
  saveData(data);
}

export function createStoredUserProgress(userId: number): StoredUserProgress {
  const now = Date.now();
  const domainStats: Record<string, StoredDomainStats> = {};
  for (let i = 1; i <= 5; i++) {
    domainStats[String(i)] = { correct: 0, total: 0 };
  }
  return {
    userId,
    domainStats,
    history: [],
    sessions: [],
    currentDifficulty: "easy",
    lastActiveAt: now,
    createdAt: now,
  };
}

export function hashQuestion(
  questionText: string,
  options: string[]
): string {
  const raw = questionText + options.join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function wasQuestionAsked(
  progress: StoredUserProgress,
  questionHash: string
): boolean {
  return progress.history.some((h) => h.question_hash === questionHash);
}

export function getTaskStatementHistory(
  progress: StoredUserProgress,
  taskStatementId: string
): StoredAnswerRecord[] {
  return progress.history.filter(
    (h) => h.task_statement_id === taskStatementId
  );
}

export function getTimeSinceLastSession(
  progress: StoredUserProgress
): number | null {
  if (progress.sessions.length === 0) return null;
  const lastSession = progress.sessions[progress.sessions.length - 1];
  return Date.now() - lastSession.endedAt;
}

export function startSession(progress: StoredUserProgress): void {
  progress.sessions.push({
    startedAt: Date.now(),
    endedAt: Date.now(),
    questionsAnswered: 0,
  });
  progress.lastActiveAt = Date.now();
}

export function updateCurrentSession(progress: StoredUserProgress): void {
  if (progress.sessions.length === 0) {
    startSession(progress);
    return;
  }
  const current = progress.sessions[progress.sessions.length - 1];
  current.endedAt = Date.now();
  current.questionsAnswered++;
  progress.lastActiveAt = Date.now();
}

const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes

export function ensureActiveSession(progress: StoredUserProgress): void {
  const gap = getTimeSinceLastSession(progress);
  if (gap === null || gap > SESSION_GAP_MS) {
    startSession(progress);
  }
}
