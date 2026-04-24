import { Difficulty } from "../models/exam-question";
import {
  UserProgress,
  getDomainAccuracy,
  getOverallAccuracy,
} from "../models/user-progress";
import { StudyRecommendation } from "../models/study-recommendation";
import { DOMAINS } from "../domains/domain-definitions";
import { SCENARIOS } from "../domains/scenarios";

export function calculateDifficulty(userAccuracy: number): Difficulty {
  if (userAccuracy < 60) return "easy";
  if (userAccuracy < 75) return "medium";
  return "hard";
}

export function selectNextDomain(progress: UserProgress): number {
  const domainScores: { domainId: number; score: number }[] = [];

  for (const domain of DOMAINS) {
    const accuracy = getDomainAccuracy(progress, domain.id);
    const stats = progress.domainStats.get(domain.id);
    const total = stats?.total || 0;

    // Prioritize: low accuracy + high weight + few attempts
    const accuracyPenalty = 100 - accuracy;
    const weightBonus = domain.weight;
    const noveltyBonus = total === 0 ? 30 : Math.max(0, 15 - total * 2);

    domainScores.push({
      domainId: domain.id,
      score: accuracyPenalty + weightBonus + noveltyBonus,
    });
  }

  domainScores.sort((a, b) => b.score - a.score);

  // Weighted random selection from top 3 to add variety
  const top = domainScores.slice(0, 3);
  const totalScore = top.reduce((sum, d) => sum + d.score, 0);
  let random = Math.random() * totalScore;

  for (const entry of top) {
    random -= entry.score;
    if (random <= 0) return entry.domainId;
  }

  return top[0].domainId;
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
  progress: UserProgress
): StudyRecommendation {
  const overall = getOverallAccuracy(progress);
  const difficulty = calculateDifficulty(overall);

  const domainAccuracies = DOMAINS.map((d) => ({
    domainId: d.id,
    name: d.name,
    accuracy: getDomainAccuracy(progress, d.id),
    weight: d.weight,
    total: progress.domainStats.get(d.id)?.total || 0,
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
  lines.push(`Overall accuracy: ${overall.toFixed(0)}%`);
  lines.push(`Recommended difficulty: ${difficulty}`);
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

  return {
    weakestDomains,
    suggestedScenarioIds,
    recommendedDifficulty: difficulty,
    summary: lines.join("\n"),
  };
}
