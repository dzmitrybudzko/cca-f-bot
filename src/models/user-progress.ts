import { Difficulty } from "./exam-question";

export interface DomainStats {
  correct: number;
  total: number;
}

export interface AnswerRecord {
  domain_id: number;
  scenario_id: number;
  task_statement_id: string;
  correct: boolean;
  difficulty: Difficulty;
  timestamp: number;
}

export interface UserProgress {
  userId: number;
  domainStats: Map<number, DomainStats>;
  history: AnswerRecord[];
  currentDifficulty: Difficulty;
}

export function createUserProgress(userId: number): UserProgress {
  const domainStats = new Map<number, DomainStats>();
  for (let i = 1; i <= 5; i++) {
    domainStats.set(i, { correct: 0, total: 0 });
  }
  return {
    userId,
    domainStats,
    history: [],
    currentDifficulty: "easy",
  };
}

export function getOverallAccuracy(progress: UserProgress): number {
  let correct = 0;
  let total = 0;
  for (const stats of progress.domainStats.values()) {
    correct += stats.correct;
    total += stats.total;
  }
  return total === 0 ? 0 : (correct / total) * 100;
}

export function getDomainAccuracy(
  progress: UserProgress,
  domainId: number
): number {
  const stats = progress.domainStats.get(domainId);
  if (!stats || stats.total === 0) return 0;
  return (stats.correct / stats.total) * 100;
}
