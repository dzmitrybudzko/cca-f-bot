import { describe, it, expect } from "vitest";

// Mirror the shuffleOptions function from exam-agent.ts for testing
function shuffleOptions(
  options: [string, string, string, string],
  correctIndex: number
): { options: [string, string, string, string]; correct_index: 0 | 1 | 2 | 3 } {
  const correctAnswer = options[correctIndex];
  const indices = [0, 1, 2, 3];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const shuffled = indices.map((i) => options[i]) as [string, string, string, string];
  const newCorrectIndex = shuffled.indexOf(correctAnswer) as 0 | 1 | 2 | 3;
  return { options: shuffled, correct_index: newCorrectIndex };
}

describe("shuffleOptions", () => {
  const opts: [string, string, string, string] = [
    "Option A (correct)",
    "Option B",
    "Option C",
    "Option D",
  ];

  it("preserves all 4 options", () => {
    const result = shuffleOptions(opts, 0);
    expect(result.options).toHaveLength(4);
    expect(new Set(result.options)).toEqual(new Set(opts));
  });

  it("correct_index points to the correct answer", () => {
    for (let i = 0; i < 20; i++) {
      const result = shuffleOptions(opts, 0);
      expect(result.options[result.correct_index]).toBe("Option A (correct)");
    }
  });

  it("works when correct answer is not index 0", () => {
    for (let i = 0; i < 20; i++) {
      const result = shuffleOptions(opts, 2);
      expect(result.options[result.correct_index]).toBe("Option C");
    }
  });

  it("produces different orderings over many runs", () => {
    const positions = new Set<number>();
    for (let i = 0; i < 50; i++) {
      const result = shuffleOptions(opts, 0);
      positions.add(result.correct_index);
    }
    expect(positions.size).toBeGreaterThan(1);
  });
});
