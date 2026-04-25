import { describe, it, expect } from "vitest";
import { ANTI_PATTERNS } from "../src/anti-patterns/seven-patterns";

describe("ANTI_PATTERNS", () => {
  it("has exactly 7 anti-patterns", () => {
    expect(ANTI_PATTERNS).toHaveLength(7);
  });

  it("each has id, name, mistake, correctApproach, and relatedTaskStatement", () => {
    for (const ap of ANTI_PATTERNS) {
      expect(ap.id).toBeDefined();
      expect(ap.name.length).toBeGreaterThan(0);
      expect(ap.mistake.length).toBeGreaterThan(0);
      expect(ap.correctApproach.length).toBeGreaterThan(0);
      expect(ap.relatedTaskStatement).toBeDefined();
    }
  });

  it("has unique ids", () => {
    const ids = ANTI_PATTERNS.map((ap) => ap.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("related task statements are valid format", () => {
    for (const ap of ANTI_PATTERNS) {
      expect(ap.relatedTaskStatement).toMatch(/^\d\.\d+$/);
    }
  });
});
