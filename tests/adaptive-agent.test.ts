import { describe, it, expect } from "vitest";
import {
  calculateDifficulty,
  selectNextDomain,
  selectTaskStatement,
  selectScenarioForDomain,
  generateRecommendation,
} from "../src/agents/adaptive-agent";
import { createStoredUserProgress, StoredUserProgress } from "../src/utils/storage";

function freshProgress(): StoredUserProgress {
  return createStoredUserProgress(1);
}

function progressWithHistory(records: Array<{
  domain_id: number;
  correct: boolean;
  task_statement_id?: string;
}>): StoredUserProgress {
  const p = freshProgress();
  for (const r of records) {
    const domainId = r.domain_id;
    p.domainStats[String(domainId)].total++;
    if (r.correct) p.domainStats[String(domainId)].correct++;
    p.history.push({
      domain_id: domainId,
      scenario_id: 1,
      task_statement_id: r.task_statement_id || `${domainId}.1`,
      correct: r.correct,
      difficulty: "medium",
      timestamp: Date.now(),
      question_hash: `h${Math.random()}`,
    });
  }
  return p;
}

describe("calculateDifficulty", () => {
  it("returns easy for accuracy below 45%", () => {
    expect(calculateDifficulty(0)).toBe("easy");
    expect(calculateDifficulty(44)).toBe("easy");
  });

  it("returns medium for accuracy 45-59%", () => {
    expect(calculateDifficulty(45)).toBe("medium");
    expect(calculateDifficulty(59)).toBe("medium");
  });

  it("returns hard for accuracy 60%+", () => {
    expect(calculateDifficulty(60)).toBe("hard");
    expect(calculateDifficulty(100)).toBe("hard");
  });
});

describe("selectNextDomain", () => {
  it("returns a valid domain id (1-5)", () => {
    const p = freshProgress();
    const domain = selectNextDomain(p);
    expect(domain).toBeGreaterThanOrEqual(1);
    expect(domain).toBeLessThanOrEqual(5);
  });

  it("prefers domains with no attempts", () => {
    const p = freshProgress();
    // Mark domains 1-4 as having many correct answers
    for (let d = 1; d <= 4; d++) {
      p.domainStats[String(d)] = { correct: 20, total: 20 };
      for (let i = 0; i < 20; i++) {
        p.history.push({
          domain_id: d,
          scenario_id: 1,
          task_statement_id: `${d}.1`,
          correct: true,
          difficulty: "hard",
          timestamp: Date.now(),
          question_hash: `h${d}_${i}`,
        });
      }
    }
    // D5 has no attempts — should be picked most often
    const picks = new Map<number, number>();
    for (let i = 0; i < 100; i++) {
      const d = selectNextDomain(p);
      picks.set(d, (picks.get(d) || 0) + 1);
    }
    expect(picks.get(5)! || 0).toBeGreaterThan(30);
  });

  it("prefers weaker domains over mastered ones", () => {
    const p = freshProgress();
    // All domains have some attempts, but D1 is mastered and D2 is weak
    for (let d = 1; d <= 5; d++) {
      const isStrong = d === 1;
      p.domainStats[String(d)] = isStrong
        ? { correct: 20, total: 20 }
        : { correct: 1, total: 20 };
      for (let i = 0; i < 20; i++) {
        p.history.push({
          domain_id: d, scenario_id: 1, task_statement_id: `${d}.1`,
          correct: isStrong ? true : i === 0, difficulty: "easy",
          timestamp: Date.now(), question_hash: `d${d}_${i}`,
        });
      }
    }
    const picks = new Map<number, number>();
    for (let i = 0; i < 200; i++) {
      const d = selectNextDomain(p);
      picks.set(d, (picks.get(d) || 0) + 1);
    }
    // D1 (100% accuracy) should be picked least
    const d1Picks = picks.get(1) || 0;
    const otherPicks = [2, 3, 4, 5].map((d) => picks.get(d) || 0);
    const avgOther = otherPicks.reduce((a, b) => a + b, 0) / 4;
    expect(avgOther).toBeGreaterThan(d1Picks);
  });
});

describe("selectTaskStatement", () => {
  it("returns a valid task statement id for domain 1", () => {
    const ts = selectTaskStatement(freshProgress(), 1);
    expect(ts).toMatch(/^1\.\d+$/);
  });

  it("returns a valid task statement id for domain 5", () => {
    const ts = selectTaskStatement(freshProgress(), 5);
    expect(ts).toMatch(/^5\.\d+$/);
  });

  it("falls back to 1.1 for invalid domain", () => {
    const ts = selectTaskStatement(freshProgress(), 99);
    expect(ts).toBe("1.1");
  });
});

describe("selectScenarioForDomain", () => {
  it("returns a valid scenario id (1-6)", () => {
    for (let d = 1; d <= 5; d++) {
      const s = selectScenarioForDomain(d);
      expect(s).toBeGreaterThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(6);
    }
  });

  it("returns matching scenarios for D1 (should be 1, 3, or 4)", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 50; i++) {
      seen.add(selectScenarioForDomain(1));
    }
    for (const s of seen) {
      expect([1, 3, 4]).toContain(s);
    }
  });

  it("returns matching scenarios for D4 (primaryDomains include D4 in scenarios 4, 5, 6)", () => {
    // Scenario 4: [2,3,1], Scenario 5: [3,4], Scenario 6: [4,5]
    // So D4 matches scenarios 5 and 6
    const seen = new Set<number>();
    for (let i = 0; i < 50; i++) {
      seen.add(selectScenarioForDomain(4));
    }
    for (const s of seen) {
      expect([5, 6]).toContain(s);
    }
  });
});

describe("generateRecommendation", () => {
  it("returns recommendation with weak domains for fresh user", () => {
    const p = progressWithHistory([
      { domain_id: 1, correct: true },
      { domain_id: 1, correct: false },
    ]);
    const rec = generateRecommendation(p);
    expect(rec.weakestDomains.length).toBeGreaterThan(0);
    expect(rec.summary).toContain("Overall accuracy");
    expect(rec.recommendedDifficulty).toBeDefined();
  });

  it("includes projected score", () => {
    const p = progressWithHistory([
      { domain_id: 1, correct: true },
    ]);
    const rec = generateRecommendation(p);
    expect(rec.summary).toContain("Projected score");
  });

  it("identifies domains with no attempts as weak", () => {
    const p = progressWithHistory([
      { domain_id: 1, correct: true },
      { domain_id: 1, correct: true },
      { domain_id: 1, correct: true },
    ]);
    const rec = generateRecommendation(p);
    // D2-D5 have no attempts, so should be in weakest
    expect(rec.weakestDomains).toContain(2);
  });

  it("returns suggested scenario ids", () => {
    const p = progressWithHistory([
      { domain_id: 1, correct: true },
    ]);
    const rec = generateRecommendation(p);
    expect(rec.suggestedScenarioIds.length).toBeGreaterThan(0);
    for (const id of rec.suggestedScenarioIds) {
      expect(id).toBeGreaterThanOrEqual(1);
      expect(id).toBeLessThanOrEqual(6);
    }
  });
});
