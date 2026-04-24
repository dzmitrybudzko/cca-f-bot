import { Telegraf, Context } from "telegraf";
import Anthropic from "@anthropic-ai/sdk";
import { CCAExamAgent } from "../agents/exam-agent";
import {
  calculateDifficulty,
  selectNextDomain,
  selectScenarioForDomain,
  generateRecommendation,
} from "../agents/adaptive-agent";
import {
  MockExamSimulator,
  MockExamResult,
} from "../agents/mock-exam-simulator";
import {
  UserProgress,
  createUserProgress,
  getOverallAccuracy,
  getDomainAccuracy,
} from "../models/user-progress";
import { ExamQuestion } from "../models/exam-question";
import { DOMAINS } from "../domains/domain-definitions";
import { answerKeyboard, examStartKeyboard, domainKeyboard } from "./keyboards";

interface ActiveQuestion {
  question: ExamQuestion;
  messageId?: number;
}

interface ExamSession {
  result: MockExamResult;
  currentIndex: number;
}

export function createBot(token: string, anthropicClient: Anthropic): Telegraf {
  const bot = new Telegraf(token);
  const examAgent = new CCAExamAgent(anthropicClient);
  const mockSimulator = new MockExamSimulator(examAgent, {
    totalQuestions: 10,
    difficulty: "medium",
  });

  const userProgress = new Map<number, UserProgress>();
  const activeQuestions = new Map<number, ActiveQuestion>();
  const examSessions = new Map<number, ExamSession>();

  function getProgress(userId: number): UserProgress {
    if (!userProgress.has(userId)) {
      userProgress.set(userId, createUserProgress(userId));
    }
    return userProgress.get(userId)!;
  }

  bot.command("start", async (ctx) => {
    await ctx.reply(
      `Welcome to CCA-F Exam Prep Bot!

This bot helps you prepare for the Claude Certified Architect – Foundations exam.

Commands:
/practice — Get an adaptive practice question
/domain — Choose a specific domain to practice
/exam — Start a mini mock exam (10 questions)
/stats — View your performance statistics
/recommend — Get study recommendations

The exam covers 5 domains:
  D1: Agentic Architecture & Orchestration (27%)
  D2: Tool Design & MCP Integration (18%)
  D3: Claude Code Configuration & Workflows (20%)
  D4: Prompt Engineering & Structured Output (20%)
  D5: Context Management & Reliability (15%)

Passing score: 720/1000. Let's aim for 1000!`
    );
  });

  bot.command("practice", async (ctx) => {
    const userId = ctx.from.id;
    const progress = getProgress(userId);

    if (examSessions.has(userId)) {
      await ctx.reply("You have an active exam session. Finish it first or use /exam to see your current question.");
      return;
    }

    await ctx.reply("Generating question...");

    try {
      const domainId = selectNextDomain(progress);
      const scenarioId = selectScenarioForDomain(domainId);
      const difficulty = calculateDifficulty(getOverallAccuracy(progress));

      const question = await examAgent.generateQuestion(
        domainId,
        scenarioId,
        difficulty
      );

      const questionId = `q_${userId}_${Date.now()}`;
      activeQuestions.set(userId, { question });

      const text = formatQuestion(question, questionId);
      await ctx.reply(text, {
        parse_mode: "HTML",
        ...answerKeyboard(questionId),
      });
    } catch (error) {
      console.error("Question generation error:", error);
      await ctx.reply(
        "Failed to generate a question. Please try again in a moment."
      );
    }
  });

  bot.command("domain", async (ctx) => {
    if (examSessions.has(ctx.from.id)) {
      await ctx.reply("Finish your active exam first.");
      return;
    }
    await ctx.reply("Choose a domain to practice:", domainKeyboard());
  });

  bot.action(/^domain:(\d)$/, async (ctx) => {
    const userId = ctx.from!.id;
    const domainId = parseInt(ctx.match[1]);

    if (domainId < 1 || domainId > 5) {
      await ctx.answerCbQuery("Invalid domain");
      return;
    }

    await ctx.answerCbQuery();
    await ctx.reply("Generating question...");

    try {
      const progress = getProgress(userId);
      const scenarioId = selectScenarioForDomain(domainId);
      const difficulty = calculateDifficulty(getDomainAccuracy(progress, domainId));

      const question = await examAgent.generateQuestion(
        domainId,
        scenarioId,
        difficulty
      );

      const questionId = `q_${userId}_${Date.now()}`;
      activeQuestions.set(userId, { question });

      const text = formatQuestion(question, questionId);
      await ctx.reply(text, {
        parse_mode: "HTML",
        ...answerKeyboard(questionId),
      });
    } catch (error) {
      console.error("Question generation error:", error);
      await ctx.reply("Failed to generate a question. Please try again.");
    }
  });

  bot.command("exam", async (ctx) => {
    const userId = ctx.from.id;

    if (examSessions.has(userId)) {
      const session = examSessions.get(userId)!;
      await ctx.reply(
        `You have an active exam: question ${session.currentIndex + 1}/${session.result.questions.length}. Answer the current question to continue.`
      );
      return;
    }

    await ctx.reply(
      `Mini Mock Exam (10 questions)

This simulates the CCA-F exam format:
- Questions distributed by domain weight
- 4 random scenarios selected
- Scaled scoring (passing: 720/1000)

Ready?`,
      examStartKeyboard()
    );
  });

  bot.action("exam:start", async (ctx) => {
    const userId = ctx.from!.id;
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined);
    await ctx.reply("Generating exam questions... This may take a moment.");

    try {
      const result = await mockSimulator.generateExam();

      if (result.questions.length === 0) {
        await ctx.reply("Failed to generate exam questions. Please try again.");
        return;
      }

      const session: ExamSession = { result, currentIndex: 0 };
      examSessions.set(userId, session);

      await sendExamQuestion(ctx, userId, session);
    } catch (error) {
      console.error("Exam generation error:", error);
      await ctx.reply("Failed to generate exam. Please try again.");
    }
  });

  bot.action("exam:cancel", async (ctx) => {
    await ctx.answerCbQuery("Exam cancelled");
    await ctx.editMessageReplyMarkup(undefined);
  });

  bot.action(/^answer:(.+):(\d)$/, async (ctx) => {
    const userId = ctx.from!.id;
    const answerIndex = parseInt(ctx.match[2]);

    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup(undefined);

    const examSession = examSessions.get(userId);

    if (examSession) {
      await handleExamAnswer(ctx, userId, examSession, answerIndex);
      return;
    }

    const active = activeQuestions.get(userId);
    if (!active) {
      await ctx.reply("This question has expired. Use /practice for a new one.");
      return;
    }

    const question = active.question;
    const isCorrect = answerIndex === question.correct_index;
    const progress = getProgress(userId);

    const stats = progress.domainStats.get(question.domain_id)!;
    stats.total++;
    if (isCorrect) stats.correct++;

    progress.history.push({
      domain_id: question.domain_id,
      scenario_id: question.scenario_id,
      task_statement_id: question.task_statement_id,
      correct: isCorrect,
      difficulty: question.difficulty,
      timestamp: Date.now(),
    });

    progress.currentDifficulty = calculateDifficulty(
      getOverallAccuracy(progress)
    );

    activeQuestions.delete(userId);

    const labels = ["A", "B", "C", "D"];
    const emoji = isCorrect ? "+" : "x";
    const yourAnswer = labels[answerIndex];
    const correctAnswer = labels[question.correct_index];

    let response = `[${emoji}] ${isCorrect ? "Correct!" : "Incorrect."}\n`;
    response += `Your answer: ${yourAnswer}\n`;
    if (!isCorrect) response += `Correct answer: ${correctAnswer}\n`;
    response += `\n${question.explanation}`;
    response += `\n\nKey concept: ${question.key_concept}`;

    await ctx.reply(response);
  });

  bot.command("stats", async (ctx) => {
    const userId = ctx.from.id;
    const progress = getProgress(userId);
    const overall = getOverallAccuracy(progress);
    const totalAnswered = progress.history.length;

    if (totalAnswered === 0) {
      await ctx.reply(
        "No practice history yet. Use /practice to get started!"
      );
      return;
    }

    let text = `Your Statistics\n\n`;
    text += `Total questions: ${totalAnswered}\n`;
    text += `Overall accuracy: ${overall.toFixed(0)}%\n`;
    text += `Current difficulty: ${progress.currentDifficulty}\n\n`;
    text += `Domain Breakdown:\n`;

    for (const domain of DOMAINS) {
      const stats = progress.domainStats.get(domain.id)!;
      const acc =
        stats.total === 0
          ? "—"
          : `${((stats.correct / stats.total) * 100).toFixed(0)}%`;
      const bar = stats.total === 0 ? " " : getDomainAccuracy(progress, domain.id) >= 72 ? "+" : "-";
      text += `  [${bar}] D${domain.id}: ${stats.correct}/${stats.total} (${acc})\n`;
    }

    const projected = Math.round(100 + (overall / 100) * 900);
    text += `\nProjected score: ${projected}/1000 ${projected >= 720 ? "(PASS)" : "(need 720)"}`;

    await ctx.reply(text);
  });

  bot.command("recommend", async (ctx) => {
    const userId = ctx.from.id;
    const progress = getProgress(userId);

    if (progress.history.length === 0) {
      await ctx.reply(
        "No practice history yet. Use /practice to get started, then I can give recommendations!"
      );
      return;
    }

    const rec = generateRecommendation(progress);
    await ctx.reply(`Study Recommendations\n\n${rec.summary}`);
  });

  async function handleExamAnswer(
    ctx: Context,
    userId: number,
    session: ExamSession,
    answerIndex: number
  ) {
    const isCorrect = MockExamSimulator.submitAnswer(
      session.result,
      session.currentIndex,
      answerIndex
    );

    const question = session.result.questions[session.currentIndex];
    const labels = ["A", "B", "C", "D"];
    const emoji = isCorrect ? "+" : "x";

    let response = `[${emoji}] ${isCorrect ? "Correct!" : "Incorrect."}`;
    response += ` (${labels[answerIndex]}`;
    if (!isCorrect) response += ` -> ${labels[question.correct_index]}`;
    response += `)`;

    await ctx.reply(response);

    session.currentIndex++;

    if (session.currentIndex >= session.result.questions.length) {
      MockExamSimulator.finalize(session.result);
      const resultText = MockExamSimulator.formatResults(session.result);
      await ctx.reply(resultText);

      const progress = getProgress(userId);
      for (let i = 0; i < session.result.questions.length; i++) {
        const q = session.result.questions[i];
        const answered = session.result.answers[i];
        const stats = progress.domainStats.get(q.domain_id)!;
        stats.total++;
        if (answered === q.correct_index) stats.correct++;
        progress.history.push({
          domain_id: q.domain_id,
          scenario_id: q.scenario_id,
          task_statement_id: q.task_statement_id,
          correct: answered === q.correct_index,
          difficulty: q.difficulty,
          timestamp: Date.now(),
        });
      }
      progress.currentDifficulty = calculateDifficulty(getOverallAccuracy(progress));

      examSessions.delete(userId);
    } else {
      await sendExamQuestion(ctx, userId, session);
    }
  }

  async function sendExamQuestion(
    ctx: Context,
    userId: number,
    session: ExamSession
  ) {
    const question = session.result.questions[session.currentIndex];
    const questionId = `exam_${userId}_${session.currentIndex}`;
    const total = session.result.questions.length;
    const current = session.currentIndex + 1;

    let text = `<b>Exam Question ${current}/${total}</b>\n`;
    text += `D${question.domain_id} | ${question.difficulty}\n\n`;
    text += `${escapeHtml(question.question_text)}\n\n`;

    const labels = ["A", "B", "C", "D"];
    for (let i = 0; i < 4; i++) {
      text += `<b>${labels[i]}.</b> ${escapeHtml(question.options[i])}\n\n`;
    }

    await ctx.reply(text, {
      parse_mode: "HTML",
      ...answerKeyboard(questionId),
    });
  }

  return bot;
}

function formatQuestion(question: ExamQuestion, _questionId: string): string {
  const domain = DOMAINS.find((d) => d.id === question.domain_id);
  let text = `<b>Practice Question</b>\n`;
  text += `D${question.domain_id}: ${domain?.name || "Unknown"} | ${question.difficulty}\n\n`;
  text += `${escapeHtml(question.question_text)}\n\n`;

  const labels = ["A", "B", "C", "D"];
  for (let i = 0; i < 4; i++) {
    text += `<b>${labels[i]}.</b> ${escapeHtml(question.options[i])}\n\n`;
  }

  return text;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
