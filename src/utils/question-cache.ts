import fs from "fs";
import path from "path";
import { ExamQuestion, Difficulty } from "../models/exam-question";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const CACHE_FILE = path.join(DATA_DIR, "question-cache.json");

const MIN_CACHE_SIZE = 5;
const REFILL_BATCH_SIZE = 10;

interface CacheEntry {
  question: ExamQuestion;
  createdAt: number;
}

interface CacheData {
  questions: CacheEntry[];
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadCache(): CacheData {
  ensureDataDir();
  if (!fs.existsSync(CACHE_FILE)) {
    return { questions: [] };
  }
  const raw = fs.readFileSync(CACHE_FILE, "utf-8");
  return JSON.parse(raw) as CacheData;
}

function saveCache(cache: CacheData): void {
  ensureDataDir();
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

export function getCachedQuestion(
  domainId: number,
  difficulty: Difficulty,
  excludeHashes: Set<string>
): ExamQuestion | null {
  const cache = loadCache();

  const idx = cache.questions.findIndex((entry) => {
    const q = entry.question;
    if (q.domain_id !== domainId) return false;
    if (q.difficulty !== difficulty) return false;
    const hash = simpleHash(q.question_text + q.options.join("|"));
    if (excludeHashes.has(hash)) return false;
    return true;
  });

  if (idx === -1) return null;

  const [entry] = cache.questions.splice(idx, 1);
  saveCache(cache);
  return entry.question;
}

export function addToCache(questions: ExamQuestion[]): void {
  const cache = loadCache();
  const now = Date.now();
  for (const q of questions) {
    cache.questions.push({ question: q, createdAt: now });
  }
  saveCache(cache);
}

export function getCacheSize(): number {
  return loadCache().questions.length;
}

export function needsRefill(): boolean {
  return getCacheSize() < MIN_CACHE_SIZE;
}

export function getRefillBatchSize(): number {
  return REFILL_BATCH_SIZE;
}

function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const chr = text.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
