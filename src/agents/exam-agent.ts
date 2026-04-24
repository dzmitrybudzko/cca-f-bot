import Anthropic from "@anthropic-ai/sdk";
import { ExamQuestion, Difficulty } from "../models/exam-question";
import { getDomainById, getTaskStatement } from "../domains/domain-definitions";
import { getScenarioById } from "../domains/scenarios";
import { ANTI_PATTERNS } from "../anti-patterns/seven-patterns";
import { OUT_OF_SCOPE_TOPICS } from "../knowledge-base/cca-knowledge";
import { validateExamQuestion } from "../utils/validation";

const QUESTION_TOOL = {
  name: "submit_exam_question",
  description:
    "Submit a generated CCA-F exam question with all required fields",
  input_schema: {
    type: "object" as const,
    properties: {
      question_text: {
        type: "string",
        description: "The question text grounded in the given scenario",
      },
      options: {
        type: "array",
        items: { type: "string" },
        minItems: 4,
        maxItems: 4,
        description: "Exactly 4 answer options (A, B, C, D)",
      },
      correct_index: {
        type: "number",
        enum: [0, 1, 2, 3],
        description: "Index of the correct answer (0-3)",
      },
      explanation: {
        type: "string",
        description:
          "Explanation of why the correct answer is right and why each distractor fails",
      },
      key_concept: {
        type: "string",
        description: "The key concept being tested",
      },
      anti_patterns_in_distractors: {
        type: "array",
        items: { type: "string" },
        description:
          "IDs of anti-patterns used in distractors (e.g., AP1, AP2)",
      },
    },
    required: [
      "question_text",
      "options",
      "correct_index",
      "explanation",
      "key_concept",
      "anti_patterns_in_distractors",
    ],
  },
};

function buildSystemPrompt(
  domainId: number,
  scenarioId: number,
  difficulty: Difficulty,
  taskStatementId?: string
): string {
  const domain = getDomainById(domainId);
  const scenario = getScenarioById(scenarioId);
  if (!domain || !scenario) {
    throw new Error(
      `Invalid domain_id ${domainId} or scenario_id ${scenarioId}`
    );
  }

  let taskContext = "";
  if (taskStatementId) {
    const ts = getTaskStatement(domainId, taskStatementId);
    if (ts) {
      taskContext = `
SPECIFIC TASK STATEMENT: ${ts.id} - ${ts.title}
Knowledge of:
${ts.knowledgeOf.map((k) => `- ${k}`).join("\n")}

Skills in:
${ts.skillsIn.map((s) => `- ${s}`).join("\n")}`;
    }
  } else {
    const randomTs =
      domain.taskStatements[
        Math.floor(Math.random() * domain.taskStatements.length)
      ];
    taskContext = `
SPECIFIC TASK STATEMENT: ${randomTs.id} - ${randomTs.title}
Knowledge of:
${randomTs.knowledgeOf.map((k) => `- ${k}`).join("\n")}

Skills in:
${randomTs.skillsIn.map((s) => `- ${s}`).join("\n")}`;
  }

  const antiPatternContext = ANTI_PATTERNS.map(
    (ap) => `- ${ap.id}: ${ap.name} — ${ap.mistake}`
  ).join("\n");

  const outOfScopeContext = OUT_OF_SCOPE_TOPICS.map(
    (t) => `- ${t}`
  ).join("\n");

  return `You are a Claude Certified Architect – Foundations (CCA-F) exam question generator.
Your task is to create a realistic, production-grade scenario-based multiple-choice question.

MANDATORY RULES:
1. Question MUST be scenario-grounded in: "${scenario.name}"
   Scenario context: ${scenario.description}
2. Question MUST test Domain ${domain.id}: ${domain.name}
${taskContext}
3. Difficulty level: ${difficulty}
   - easy: Tests direct recall of concepts and straightforward application
   - medium: Requires analysis of a production scenario and choosing the best approach among plausible options
   - hard: Requires deep understanding of tradeoffs, edge cases, and subtle distinctions between valid approaches
4. Distractors must be REAL architectural anti-patterns or common mistakes, not obviously wrong answers
5. Include precise terminology from the official exam guide (stop_reason, CLAUDE.md, tool_choice, etc.)
6. The explanation MUST explain why the correct answer is right AND why each distractor fails

ANTI-PATTERNS TO USE IN DISTRACTORS (where appropriate):
${antiPatternContext}

DO NOT generate questions about these OUT-OF-SCOPE topics:
${outOfScopeContext}

Use the submit_exam_question tool to return the question.`;
}

export class CCAExamAgent {
  private client: Anthropic;
  private maxRetries: number;

  constructor(client: Anthropic, maxRetries = 2) {
    this.client = client;
    this.maxRetries = maxRetries;
  }

  async generateQuestion(
    domainId: number,
    scenarioId: number,
    difficulty: Difficulty,
    taskStatementId?: string
  ): Promise<ExamQuestion> {
    const systemPrompt = buildSystemPrompt(
      domainId,
      scenarioId,
      difficulty,
      taskStatementId
    );

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const userMessage =
          attempt === 0
            ? "Generate one exam question following all the rules above."
            : `The previous attempt had validation errors: ${lastError?.message}. Please fix these issues and generate a valid question.`;

        const response = await this.client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1500,
          system: systemPrompt,
          tools: [QUESTION_TOOL],
          tool_choice: { type: "tool", name: "submit_exam_question" },
          messages: [{ role: "user", content: userMessage }],
        });

        const toolUseBlock = response.content.find(
          (block) => block.type === "tool_use"
        );
        if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
          throw new Error("No tool_use block in response");
        }

        const input = toolUseBlock.input as Record<string, unknown>;

        const question: ExamQuestion = {
          question_text: input.question_text as string,
          options: input.options as [string, string, string, string],
          correct_index: input.correct_index as 0 | 1 | 2 | 3,
          explanation: input.explanation as string,
          key_concept: input.key_concept as string,
          domain_id: domainId as 1 | 2 | 3 | 4 | 5,
          scenario_id: scenarioId as 1 | 2 | 3 | 4 | 5 | 6,
          task_statement_id:
            taskStatementId ||
            getDomainById(domainId)!.taskStatements[
              Math.floor(
                Math.random() *
                  getDomainById(domainId)!.taskStatements.length
              )
            ].id,
          difficulty,
          anti_patterns_in_distractors:
            (input.anti_patterns_in_distractors as string[]) || [],
        };

        const errors = validateExamQuestion(question);
        if (errors.length > 0) {
          throw new Error(errors.join("; "));
        }

        return question;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt === this.maxRetries) {
          throw new Error(
            `Failed to generate valid question after ${this.maxRetries + 1} attempts: ${lastError.message}`
          );
        }
      }
    }

    throw new Error("Unreachable");
  }
}
