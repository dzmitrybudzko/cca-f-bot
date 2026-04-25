import { describe, it, expect } from "vitest";
import {
  DOMAINS,
  getDomainById,
  getTaskStatement,
  getAllTaskStatements,
} from "../src/domains/domain-definitions";
import {
  SCENARIOS,
  getScenarioById,
  getRandomScenarios,
} from "../src/domains/scenarios";

describe("DOMAINS", () => {
  it("has exactly 5 domains", () => {
    expect(DOMAINS).toHaveLength(5);
  });

  it("domain ids are 1-5", () => {
    const ids = DOMAINS.map((d) => d.id);
    expect(ids).toEqual([1, 2, 3, 4, 5]);
  });

  it("weights sum to 100", () => {
    const sum = DOMAINS.reduce((s, d) => s + d.weight, 0);
    expect(sum).toBe(100);
  });

  it("question counts sum to 60", () => {
    const sum = DOMAINS.reduce((s, d) => s + d.questionCount, 0);
    expect(sum).toBe(60);
  });

  it("each domain has task statements", () => {
    for (const d of DOMAINS) {
      expect(d.taskStatements.length).toBeGreaterThan(0);
    }
  });

  it("task statement ids match domain", () => {
    for (const d of DOMAINS) {
      for (const ts of d.taskStatements) {
        expect(ts.id).toMatch(new RegExp(`^${d.id}\\.\\d+$`));
      }
    }
  });

  it("each task statement has knowledgeOf and skillsIn", () => {
    for (const d of DOMAINS) {
      for (const ts of d.taskStatements) {
        expect(ts.knowledgeOf.length).toBeGreaterThan(0);
        expect(ts.skillsIn.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("getDomainById", () => {
  it("returns domain for valid id", () => {
    const d = getDomainById(1);
    expect(d).toBeDefined();
    expect(d!.name).toContain("Agentic");
  });

  it("returns undefined for invalid id", () => {
    expect(getDomainById(0)).toBeUndefined();
    expect(getDomainById(6)).toBeUndefined();
    expect(getDomainById(-1)).toBeUndefined();
  });
});

describe("getTaskStatement", () => {
  it("returns task statement for valid ids", () => {
    const ts = getTaskStatement(1, "1.1");
    expect(ts).toBeDefined();
    expect(ts!.id).toBe("1.1");
  });

  it("returns undefined for invalid domain", () => {
    expect(getTaskStatement(99, "99.1")).toBeUndefined();
  });

  it("returns undefined for invalid task id", () => {
    expect(getTaskStatement(1, "1.99")).toBeUndefined();
  });
});

describe("getAllTaskStatements", () => {
  it("returns 30 task statements total", () => {
    const all = getAllTaskStatements();
    expect(all).toHaveLength(30);
  });

  it("all have unique ids", () => {
    const all = getAllTaskStatements();
    const ids = all.map((ts) => ts.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("SCENARIOS", () => {
  it("has exactly 6 scenarios", () => {
    expect(SCENARIOS).toHaveLength(6);
  });

  it("scenario ids are 1-6", () => {
    const ids = SCENARIOS.map((s) => s.id);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("each scenario has primaryDomains", () => {
    for (const s of SCENARIOS) {
      expect(s.primaryDomains.length).toBeGreaterThan(0);
      for (const d of s.primaryDomains) {
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(5);
      }
    }
  });

  it("each scenario has a description", () => {
    for (const s of SCENARIOS) {
      expect(s.description.length).toBeGreaterThan(20);
    }
  });
});

describe("getScenarioById", () => {
  it("returns scenario for valid id", () => {
    const s = getScenarioById(1);
    expect(s).toBeDefined();
    expect(s!.name).toContain("Customer Support");
  });

  it("returns undefined for invalid id", () => {
    expect(getScenarioById(0)).toBeUndefined();
    expect(getScenarioById(7)).toBeUndefined();
  });
});

describe("getRandomScenarios", () => {
  it("returns requested count", () => {
    const result = getRandomScenarios(4);
    expect(result).toHaveLength(4);
  });

  it("returns unique scenarios", () => {
    const result = getRandomScenarios(4);
    const ids = result.map((s) => s.id);
    expect(new Set(ids).size).toBe(4);
  });

  it("returns all 6 when requesting 6", () => {
    const result = getRandomScenarios(6);
    expect(result).toHaveLength(6);
  });

  it("clamps to available scenarios", () => {
    const result = getRandomScenarios(10);
    expect(result).toHaveLength(6);
  });
});
