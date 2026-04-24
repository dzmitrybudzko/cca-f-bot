import { CCAExamAgent } from "./exam-agent";
import { ExamQuestion, Difficulty } from "../models/exam-question";
import { DOMAINS } from "../domains/domain-definitions";
import { getRandomScenarios } from "../domains/scenarios";

export interface MockExamConfig {
  totalQuestions: number;
  scenarioCount: number;
  difficulty: Difficulty;
  timeLimitMinutes: number;
}

export interface MockExamResult {
  questions: ExamQuestion[];
  answers: (number | null)[];
  correct: number;
  total: number;
  scaledScore: number;
  domainBreakdown: {
    domainId: number;
    domainName: string;
    correct: number;
    total: number;
    percentage: number;
  }[];
  startTime: number;
  endTime: number | null;
}

const DEFAULT_CONFIG: MockExamConfig = {
  totalQuestions: 60,
  scenarioCount: 4,
  difficulty: "medium",
  timeLimitMinutes: 120,
};

function buildQuestionDistribution(
  totalQuestions: number
): Map<number, number> {
  const distribution = new Map<number, number>();
  let assigned = 0;

  const sorted = [...DOMAINS].sort((a, b) => b.weight - a.weight);

  for (let i = 0; i < sorted.length; i++) {
    const domain = sorted[i];
    if (i === sorted.length - 1) {
      distribution.set(domain.id, totalQuestions - assigned);
    } else {
      const count = Math.round((domain.weight / 100) * totalQuestions);
      distribution.set(domain.id, count);
      assigned += count;
    }
  }

  return distribution;
}

export class MockExamSimulator {
  private agent: CCAExamAgent;
  private config: MockExamConfig;

  constructor(agent: CCAExamAgent, config?: Partial<MockExamConfig>) {
    this.agent = agent;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async generateExam(): Promise<MockExamResult> {
    const scenarios = getRandomScenarios(this.config.scenarioCount);
    const scenarioIds = scenarios.map((s) => s.id);
    const distribution = buildQuestionDistribution(
      this.config.totalQuestions
    );

    const questions: ExamQuestion[] = [];
    let scenarioIndex = 0;

    for (const [domainId, count] of distribution) {
      for (let i = 0; i < count; i++) {
        const scenarioId = scenarioIds[scenarioIndex % scenarioIds.length];
        scenarioIndex++;

        try {
          const question = await this.agent.generateQuestion(
            domainId,
            scenarioId,
            this.config.difficulty
          );
          questions.push(question);
        } catch (error) {
          console.error(
            `Failed to generate question for D${domainId}/S${scenarioId}:`,
            error
          );
        }
      }
    }

    return {
      questions,
      answers: new Array(questions.length).fill(null),
      correct: 0,
      total: questions.length,
      scaledScore: 0,
      domainBreakdown: DOMAINS.map((d) => ({
        domainId: d.id,
        domainName: d.name,
        correct: 0,
        total: distribution.get(d.id) || 0,
        percentage: 0,
      })),
      startTime: Date.now(),
      endTime: null,
    };
  }

  static submitAnswer(
    result: MockExamResult,
    questionIndex: number,
    answerIndex: number
  ): boolean {
    const question = result.questions[questionIndex];
    if (!question) return false;

    result.answers[questionIndex] = answerIndex;
    const isCorrect = answerIndex === question.correct_index;

    if (isCorrect) {
      result.correct++;
      const domainEntry = result.domainBreakdown.find(
        (d) => d.domainId === question.domain_id
      );
      if (domainEntry) {
        domainEntry.correct++;
      }
    }

    return isCorrect;
  }

  static finalize(result: MockExamResult): MockExamResult {
    result.endTime = Date.now();

    for (const entry of result.domainBreakdown) {
      entry.percentage =
        entry.total === 0 ? 0 : (entry.correct / entry.total) * 100;
    }

    const rawPercentage =
      result.total === 0 ? 0 : result.correct / result.total;
    result.scaledScore = Math.round(100 + rawPercentage * 900);

    return result;
  }

  static formatResults(result: MockExamResult): string {
    const lines: string[] = [];
    const passed = result.scaledScore >= 720;

    lines.push("=== CCA-F Mock Exam Results ===");
    lines.push("");
    lines.push(
      `Score: ${result.scaledScore}/1000 ${passed ? "PASS" : "FAIL"} (passing: 720)`
    );
    lines.push(`Correct: ${result.correct}/${result.total}`);

    if (result.startTime && result.endTime) {
      const minutes = Math.round(
        (result.endTime - result.startTime) / 60000
      );
      lines.push(`Time: ${minutes} minutes`);
    }

    lines.push("");
    lines.push("Domain Breakdown:");

    for (const entry of result.domainBreakdown) {
      const bar = entry.percentage >= 72 ? "+" : "-";
      lines.push(
        `  [${bar}] D${entry.domainId}: ${entry.domainName} — ${entry.correct}/${entry.total} (${entry.percentage.toFixed(0)}%)`
      );
    }

    return lines.join("\n");
  }
}
