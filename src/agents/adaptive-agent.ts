import { Difficulty } from "../models/exam-question";
import { StudyRecommendation } from "../models/study-recommendation";
import { DOMAINS, getAllTaskStatements } from "../domains/domain-definitions";
import { SCENARIOS } from "../domains/scenarios";
import {
  StoredUserProgress,
  StoredAnswerRecord,
  getTimeSinceLastSession,
} from "../utils/storage";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export function calculateDifficulty(userAccuracy: number): Difficulty {
  if (userAccuracy < 45) return "easy";
  if (userAccuracy < 60) return "medium";
  return "hard";
}

function getDomainAccuracy(progress: StoredUserProgress, domainId: number): number {
  const stats = progress.domainStats[String(domainId)];
  if (!stats || stats.total === 0) return 0;
  return (stats.correct / stats.total) * 100;
}

function getOverallAccuracy(progress: StoredUserProgress): number {
  let correct = 0;
  let total = 0;
  for (const stats of Object.values(progress.domainStats)) {
    correct += stats.correct;
    total += stats.total;
  }
  return total === 0 ? 0 : (correct / total) * 100;
}

function getTaskStatementRecency(
  progress: StoredUserProgress,
  taskStatementId: string
): number | null {
  const records = progress.history.filter(
    (h) => h.task_statement_id === taskStatementId
  );
  if (records.length === 0) return null;
  const latest = Math.max(...records.map((r) => r.timestamp));
  return Date.now() - latest;
}

function getTaskStatementAccuracy(
  progress: StoredUserProgress,
  taskStatementId: string
): { correct: number; total: number; accuracy: number } {
  const records = progress.history.filter(
    (h) => h.task_statement_id === taskStatementId
  );
  const correct = records.filter((r) => r.correct).length;
  const total = records.length;
  return { correct, total, accuracy: total === 0 ? 0 : (correct / total) * 100 };
}

// Spaced repetition: topics answered correctly long ago need retesting
// Topics answered incorrectly need sooner retesting
function spacedRepetitionScore(
  progress: StoredUserProgress,
  taskStatementId: string
): number {
  const recency = getTaskStatementRecency(progress, taskStatementId);
  const stats = getTaskStatementAccuracy(progress, taskStatementId);

  // Never asked -> highest priority
  if (recency === null) return 100;

  // Recently answered correctly -> low priority
  // Long ago answered correctly -> medium priority (needs refresh)
  // Recently answered incorrectly -> high priority
  // Long ago answered incorrectly -> highest priority

  const daysSince = recency / DAY_MS;
  const accuracyFactor = 100 - stats.accuracy;

  if (stats.accuracy >= 80) {
    // Mastered: retest after increasing intervals
    // 1 day -> score 10, 3 days -> 30, 7 days -> 70
    return Math.min(daysSince * 10, 80);
  }

  if (stats.accuracy >= 50) {
    // Partial: retest sooner
    return Math.min(40 + daysSince * 15, 90);
  }

  // Weak: always high priority
  return 70 + accuracyFactor * 0.3;
}

export function selectNextDomain(progress: StoredUserProgress): number {
  const domainScores: { domainId: number; score: number }[] = [];

  for (const domain of DOMAINS) {
    const accuracy = getDomainAccuracy(progress, domain.id);
    const stats = progress.domainStats[String(domain.id)];
    const total = stats?.total || 0;

    const accuracyPenalty = 100 - accuracy;
    const weightBonus = domain.weight;
    const noveltyBonus = total === 0 ? 30 : Math.max(0, 15 - total * 2);

    // Spaced repetition: boost domains not practiced recently
    const domainRecords = progress.history.filter(
      (h) => h.domain_id === domain.id
    );
    let recencyBonus = 0;
    if (domainRecords.length > 0) {
      const lastPracticed = Math.max(...domainRecords.map((r) => r.timestamp));
      const daysSince = (Date.now() - lastPracticed) / DAY_MS;
      recencyBonus = Math.min(daysSince * 5, 25);
    }

    domainScores.push({
      domainId: domain.id,
      score: accuracyPenalty + weightBonus + noveltyBonus + recencyBonus,
    });
  }

  domainScores.sort((a, b) => b.score - a.score);

  const top = domainScores.slice(0, 3);
  const totalScore = top.reduce((sum, d) => sum + d.score, 0);
  let random = Math.random() * totalScore;

  for (const entry of top) {
    random -= entry.score;
    if (random <= 0) return entry.domainId;
  }

  return top[0].domainId;
}

export function selectTaskStatement(
  progress: StoredUserProgress,
  domainId: number
): string {
  const domain = DOMAINS.find((d) => d.id === domainId);
  if (!domain) return "1.1";

  const scored = domain.taskStatements.map((ts) => ({
    id: ts.id,
    score: spacedRepetitionScore(progress, ts.id),
  }));

  scored.sort((a, b) => b.score - a.score);

  // Weighted random from top 3
  const top = scored.slice(0, Math.min(3, scored.length));
  const totalScore = top.reduce((sum, t) => sum + t.score, 0);
  if (totalScore === 0) return top[0].id;

  let random = Math.random() * totalScore;
  for (const entry of top) {
    random -= entry.score;
    if (random <= 0) return entry.id;
  }

  return top[0].id;
}

export function selectScenarioForDomain(domainId: number): number {
  const matching = SCENARIOS.filter((s) =>
    s.primaryDomains.includes(domainId)
  );

  if (matching.length === 0) {
    return SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)].id;
  }

  return matching[Math.floor(Math.random() * matching.length)].id;
}

export function generateRecommendation(
  progress: StoredUserProgress
): StudyRecommendation {
  const overall = getOverallAccuracy(progress);
  const difficulty = calculateDifficulty(overall);

  const domainAccuracies = DOMAINS.map((d) => ({
    domainId: d.id,
    name: d.name,
    accuracy: getDomainAccuracy(progress, d.id),
    weight: d.weight,
    total: progress.domainStats[String(d.id)]?.total || 0,
  }));

  domainAccuracies.sort((a, b) => a.accuracy - b.accuracy);

  const weakestDomains = domainAccuracies
    .filter((d) => d.accuracy < 75 || d.total < 3)
    .slice(0, 3)
    .map((d) => d.domainId);

  const suggestedScenarioIds = [
    ...new Set(
      weakestDomains.flatMap((dId) =>
        SCENARIOS.filter((s) => s.primaryDomains.includes(dId)).map(
          (s) => s.id
        )
      )
    ),
  ];

  const lines: string[] = [];

  // Session gap awareness
  const gap = getTimeSinceLastSession(progress);
  if (gap !== null) {
    const daysAgo = Math.floor(gap / DAY_MS);
    const hoursAgo = Math.floor(gap / HOUR_MS);
    if (daysAgo >= 1) {
      lines.push(`Last session: ${daysAgo} day(s) ago`);
    } else if (hoursAgo >= 1) {
      lines.push(`Last session: ${hoursAgo} hour(s) ago`);
    }
  }

  lines.push(`Total questions answered: ${progress.history.length}`);
  lines.push(`Overall accuracy: ${overall.toFixed(0)}%`);
  lines.push(`Recommended difficulty: ${difficulty}`);
  lines.push("");

  // Task statement coverage
  const allTs = getAllTaskStatements();
  const coveredTs = new Set(progress.history.map((h) => h.task_statement_id));
  const coverage = (coveredTs.size / allTs.length) * 100;
  lines.push(`Task statement coverage: ${coveredTs.size}/${allTs.length} (${coverage.toFixed(0)}%)`);

  // Find stale topics (answered correctly but long ago)
  const staleTopics: string[] = [];
  for (const ts of allTs) {
    const recency = getTaskStatementRecency(progress, ts.id);
    const stats = getTaskStatementAccuracy(progress, ts.id);
    if (recency !== null && recency > 3 * DAY_MS && stats.accuracy >= 70) {
      staleTopics.push(ts.id);
    }
  }
  if (staleTopics.length > 0) {
    lines.push(`Topics due for review (3+ days): ${staleTopics.join(", ")}`);
  }

  lines.push("");

  if (weakestDomains.length > 0) {
    lines.push("Focus areas:");
    for (const dId of weakestDomains) {
      const d = domainAccuracies.find((x) => x.domainId === dId)!;
      const acc = d.total === 0 ? "no attempts" : `${d.accuracy.toFixed(0)}%`;
      lines.push(`  D${d.domainId}: ${d.name} (${acc}, weight: ${d.weight}%)`);
    }
  } else {
    lines.push("Strong performance across all domains!");
  }

  // Projected score
  const projected = Math.round(100 + (overall / 100) * 900);
  lines.push("");
  lines.push(`Projected score: ${projected}/1000 ${projected >= 720 ? "(PASS)" : "(need 720)"}`);

  return {
    weakestDomains,
    suggestedScenarioIds,
    recommendedDifficulty: difficulty,
    summary: lines.join("\n"),
  };
}
