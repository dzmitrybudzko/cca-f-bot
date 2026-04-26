import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { ExamQuestion } from "../models/exam-question";

const REVIEW_TOOL = {
  name: "submit_review",
  description: "Submit the review verdict for a generated exam question",
  input_schema: {
    type: "object" as const,
    properties: {
      approved: {
        type: "boolean",
        description: "true if the question meets all criteria, false if it should be rejected",
      },
      issues: {
        type: "array",
        items: { type: "string" },
        description: "List of specific issues found (empty if approved)",
      },
      corrected_correct_index: {
        type: "number",
        enum: [0, 1, 2, 3, -1],
        description: "If the correct answer is wrong, provide the right index (0-3). Use -1 if the current answer is correct.",
      },
    },
    required: ["approved", "issues", "corrected_correct_index"],
  },
};

export interface ReviewResult {
  approved: boolean;
  issues: string[];
  correctedCorrectIndex: number;
}

let cachedPdfBase64: string | null = null;

function loadPdfBase64(): string {
  if (cachedPdfBase64) return cachedPdfBase64;
  const pdfPath = path.join(
    process.cwd(),
    "instructor_8lsy243ftffjjy1cx9lm3o2bw_public_1773274827_Claude+Certified+Architect+–+Foundations+Certification+Exam+Guide.pdf"
  );
  if (!fs.existsSync(pdfPath)) {
    throw new Error("Exam guide PDF not found at: " + pdfPath);
  }
  cachedPdfBase64 = fs.readFileSync(pdfPath).toString("base64");
  return cachedPdfBase64;
}

function formatQuestionForReview(q: ExamQuestion): string {
  const labels = ["A", "B", "C", "D"];
  let text = `QUESTION TO REVIEW:\n\n`;
  text += `Domain: ${q.domain_id}, Scenario: ${q.scenario_id}, Task: ${q.task_statement_id}, Difficulty: ${q.difficulty}\n\n`;
  text += `${q.question_text}\n\n`;
  for (let i = 0; i < 4; i++) {
    text += `${labels[i]}. ${q.options[i]}\n`;
  }
  text += `\nMarked correct: ${labels[q.correct_index]}\n`;
  text += `Explanation: ${q.explanation}\n`;
  text += `Anti-patterns in distractors: ${q.anti_patterns_in_distractors.join(", ") || "none"}`;
  return text;
}

export class ReviewAgent {
  private client: Anthropic;

  constructor(client: Anthropic) {
    this.client = client;
  }

  async review(question: ExamQuestion): Promise<ReviewResult> {
    const pdfBase64 = loadPdfBase64();
    const questionText = formatQuestionForReview(question);

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: `You are an independent quality reviewer for CCA-F (Claude Certified Architect - Foundations) exam questions. You have access to the official exam guide PDF.

Your job: verify a generated question against the official guide. This is a SEPARATE review instance — you did not generate this question.

CHECK EACH OF THESE:
1. FACTUAL ACCURACY: Is the marked correct answer actually correct per the official guide? Are any distractors accidentally correct?
2. SCOPE: Does the question test content from the official exam guide? Is it within the listed domains and task statements? Reject if it covers out-of-scope topics (fine-tuning, authentication, billing, embeddings, computer use, vision, streaming, rate limiting, etc.)
3. SCENARIO GROUNDING: Is the question grounded in a realistic production scenario?
4. DISTRACTOR QUALITY: Are distractors plausible but clearly wrong per the guide? At least 2 should be realistic anti-patterns.
5. CORRECT ANSWER UNIQUENESS: Is there exactly one best answer, or could multiple options be equally correct?

Be STRICT. If the correct answer is wrong or ambiguous, mark corrected_correct_index. If the question is out of scope or factually wrong, reject it.`,
      tools: [REVIEW_TOOL],
      tool_choice: { type: "tool", name: "submit_review" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
            },
            { type: "text", text: questionText },
          ],
        },
      ],
    });

    const toolBlock = response.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use") {
      return { approved: true, issues: [], correctedCorrectIndex: -1 };
    }

    const input = toolBlock.input as Record<string, unknown>;
    return {
      approved: input.approved as boolean,
      issues: (input.issues as string[]) || [],
      correctedCorrectIndex: (input.corrected_correct_index as number) ?? -1,
    };
  }
}
