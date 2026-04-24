import { Telegraf, Context } from "telegraf";
import Anthropic from "@anthropic-ai/sdk";
import { CCAExamAgent } from "../agents/exam-agent";
import {
  calculateDifficulty,
  selectNextDomain,
  selectTaskStatement,
  selectScenarioForDomain,
  generateRecommendation,
} from "../agents/adaptive-agent";
import {
  MockExamSimulator,
  MockExamResult,
} from "../agents/mock-exam-simulator";
import { ExplainAgent } from "../agents/explain-agent";
import { ExamQuestion } from "../models/exam-question";
import { DOMAINS } from "../domains/domain-definitions";
import {
  StoredUserProgress,
  loadUserProgress,
  saveUserProgress,
  createStoredUserProgress,
  hashQuestion,
  wasQuestionAsked,
  ensureActiveSession,
  updateCurrentSession,
  getTimeSinceLastSession,
} from "../utils/storage";
import {
  getCachedQuestion,
  addToCache,
  needsRefill,
  getCacheSize,
} from "../utils/question-cache";
import { answerKeyboard, examStartKeyboard, domainKeyboard } from "./keyboards";

interface ActiveQuestion {
  question: ExamQuestion;
}

interface ExamSession {
  result: MockExamResult;
  currentIndex: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export function createBot(token: string, anthropicClient: Anthropic): Telegraf {
  const bot = new Telegraf(token);
  const examAgent = new CCAExamAgent(anthropicClient);
  const explainAgent = new ExplainAgent(anthropicClient);
  const mockSimulator = new MockExamSimulator(examAgent, {
    totalQuestions: 10,
    difficulty: "medium",
  });

  const activeQuestions = new Map<number, ActiveQuestion>();
  const examSessions = new Map<number, ExamSession>();
  let cacheRefillInProgress = false;

  function getProgress(userId: number): StoredUserProgress {
    const stored = loadUserProgress(userId);
    if (stored) return stored;
    const fresh = createStoredUserProgress(userId);
    saveUserProgress(fresh);
    return fresh;
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

  function getDomainAccuracy(progress: StoredUserProgress, domainId: number): number {
    const stats = progress.domainStats[String(domainId)];
    if (!stats || stats.total === 0) return 0;
    return (stats.correct / stats.total) * 100;
  }

  function formatSessionGap(progress: StoredUserProgress): string {
    const gap = getTimeSinceLastSession(progress);
    if (gap === null) return "";
    const days = Math.floor(gap / DAY_MS);
    const hours = Math.floor(gap / HOUR_MS);
    if (days >= 1) return `Welcome back! Last session was ${days} day(s) ago.\n\n`;
    if (hours >= 1) return `Welcome back! Last session was ${hours} hour(s) ago.\n\n`;
    return "";
  }

  bot.command("start", async (ctx) => {
    const progress = getProgress(ctx.from.id);
    const welcomeBack = progress.history.length > 0 ? formatSessionGap(progress) : "";

    await ctx.reply(
      `${welcomeBack}Welcome to CCA-F Exam Prep Bot!

This bot helps you prepare for the Claude Certified Architect – Foundations exam.
Your progress is saved between sessions.

Commands:
/practice — Get an adaptive practice question
/domain — Choose a specific domain to practice
/exam — Start a mini mock exam (10 questions)
/explain — Explain a topic (e.g. /explain 1.3)
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

  async function backgroundCacheRefill(domainId: number, difficulty: "easy" | "medium" | "hard") {
    if (cacheRefillInProgress) return;
    cacheRefillInProgress = true;
    try {
      const batch: ExamQuestion[] = [];
      const domains = [1, 2, 3, 4, 5];
      for (let i = 0; i < 5; i++) {
        const d = domains[i];
        const scenarioId = selectScenarioForDomain(d);
        try {
          const q = await examAgent.generateQuestion(d, scenarioId, difficulty);
          batch.push(q);
        } catch {
          // skip failed generations
        }
      }
      if (batch.length > 0) {
        addToCache(batch);
        console.log(`Cache refilled: +${batch.length} questions (total: ${getCacheSize()})`);
      }
    } catch (err) {
      console.error("Cache refill error:", err);
    } finally {
      cacheRefillInProgress = false;
    }
  }

  bot.command("practice", async (ctx) => {
    const userId = ctx.from.id;
    const progress = getProgress(userId);

    if (examSessions.has(userId)) {
      await ctx.reply("You have an active exam session. Finish it first or use /exam to see your current question.");
      return;
    }

    ensureActiveSession(progress);
    saveUserProgress(progress);

    const domainId = selectNextDomain(progress);
    const difficulty = calculateDifficulty(getOverallAccuracy(progress));
    const excludeHashes = new Set(progress.history.map((h) => h.question_hash));

    const cached = getCachedQuestion(domainId, difficulty, excludeHashes);
    if (cached) {
      const welcomeBack = formatSessionGap(progress);
      const questionId = `q_${userId}_${Date.now()}`;
      activeQuestions.set(userId, { question: cached });
      const text = formatQuestion(cached);
      await ctx.reply(`${welcomeBack}${text}`, { parse_mode: "HTML", ...answerKeyboard(questionId) });

      if (needsRefill()) {
        backgroundCacheRefill(domainId, difficulty);
      }
      return;
    }

    const welcomeBack = formatSessionGap(progress);
    await ctx.reply(`${welcomeBack}Generating question...`);

    try {
      const taskStatementId = selectTaskStatement(progress, domainId);
      const scenarioId = selectScenarioForDomain(domainId);

      const question = await examAgent.generateQuestion(
        domainId,
        scenarioId,
        difficulty,
        taskStatementId
      );

      const qHash = hashQuestion(question.question_text, question.options);
      if (wasQuestionAsked(progress, qHash)) {
        const question2 = await examAgent.generateQuestion(
          domainId,
          scenarioId,
          difficulty,
          taskStatementId
        );
        const qHash2 = hashQuestion(question2.question_text, question2.options);
        if (!wasQuestionAsked(progress, qHash2)) {
          activeQuestions.set(userId, { question: question2 });
          const text = formatQuestion(question2);
          const questionId = `q_${userId}_${Date.now()}`;
          await ctx.reply(text, { parse_mode: "HTML", ...answerKeyboard(questionId) });

          if (needsRefill()) {
            backgroundCacheRefill(domainId, difficulty);
          }
          return;
        }
      }

      const questionId = `q_${userId}_${Date.now()}`;
      activeQuestions.set(userId, { question });

      const text = formatQuestion(question);
      await ctx.reply(text, { parse_mode: "HTML", ...answerKeyboard(questionId) });

      if (needsRefill()) {
        backgroundCacheRefill(domainId, difficulty);
      }
    } catch (error) {
      console.error("Question generation error:", error);
      await ctx.reply("Failed to generate a question. Please try again in a moment.");
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

    const progress = getProgress(userId);
    ensureActiveSession(progress);
    saveUserProgress(progress);

    await ctx.reply("Generating question...");

    try {
      const taskStatementId = selectTaskStatement(progress, domainId);
      const scenarioId = selectScenarioForDomain(domainId);
      const difficulty = calculateDifficulty(getDomainAccuracy(progress, domainId));

      const question = await examAgent.generateQuestion(
        domainId,
        scenarioId,
        difficulty,
        taskStatementId
      );

      const questionId = `q_${userId}_${Date.now()}`;
      activeQuestions.set(userId, { question });

      const text = formatQuestion(question);
      await ctx.reply(text, { parse_mode: "HTML", ...answerKeyboard(questionId) });
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

    const stats = progress.domainStats[String(question.domain_id)];
    stats.total++;
    if (isCorrect) stats.correct++;

    const qHash = hashQuestion(question.question_text, question.options);

    progress.history.push({
      domain_id: question.domain_id,
      scenario_id: question.scenario_id,
      task_statement_id: question.task_statement_id,
      correct: isCorrect,
      difficulty: question.difficulty,
      timestamp: Date.now(),
      question_hash: qHash,
    });

    progress.currentDifficulty = calculateDifficulty(getOverallAccuracy(progress));
    updateCurrentSession(progress);
    saveUserProgress(progress);

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
    response += `\nTask: ${question.task_statement_id} | D${question.domain_id}`;

    await ctx.reply(response);
  });

  bot.command("stats", async (ctx) => {
    const userId = ctx.from.id;
    const progress = getProgress(userId);
    const overall = getOverallAccuracy(progress);
    const totalAnswered = progress.history.length;

    if (totalAnswered === 0) {
      await ctx.reply("No practice history yet. Use /practice to get started!");
      return;
    }

    const gap = getTimeSinceLastSession(progress);
    let text = "Your Statistics\n\n";

    if (gap !== null) {
      const days = Math.floor(gap / DAY_MS);
      if (days >= 1) text += `Last active: ${days} day(s) ago\n`;
    }

    text += `Total questions: ${totalAnswered}\n`;
    text += `Sessions: ${progress.sessions.length}\n`;
    text += `Overall accuracy: ${overall.toFixed(0)}%\n`;
    text += `Current difficulty: ${progress.currentDifficulty}\n\n`;
    text += "Domain Breakdown:\n";

    for (const domain of DOMAINS) {
      const stats = progress.domainStats[String(domain.id)];
      const acc = stats.total === 0
        ? "—"
        : `${((stats.correct / stats.total) * 100).toFixed(0)}%`;
      const bar = stats.total === 0 ? " " : getDomainAccuracy(progress, domain.id) >= 72 ? "+" : "-";
      text += `  [${bar}] D${domain.id}: ${stats.correct}/${stats.total} (${acc})\n`;
    }

    // Task statement coverage
    const coveredTs = new Set(progress.history.map((h) => h.task_statement_id));
    text += `\nTask coverage: ${coveredTs.size}/29`;

    const projected = Math.round(100 + (overall / 100) * 900);
    text += `\nProjected score: ${projected}/1000 ${projected >= 720 ? "(PASS)" : "(need 720)"}`;

    await ctx.reply(text);
  });

  bot.command("explain", async (ctx) => {
    const arg = ctx.message.text.split(/\s+/)[1];
    if (!arg) {
      await ctx.reply(
        "Usage:\n  /explain 1.3 — explain task statement 1.3\n  /explain 2 — overview of domain 2\n\nDomains: 1-5, Task statements: 1.1-1.7, 2.1-2.5, 3.1-3.6, 4.1-4.6, 5.1-5.6"
      );
      return;
    }

    if (/^\d$/.test(arg)) {
      const domainId = parseInt(arg);
      const text = await explainAgent.explainDomain(domainId);
      await ctx.reply(text);
      return;
    }

    if (/^\d\.\d+$/.test(arg)) {
      await ctx.reply("Generating explanation...");
      try {
        const text = await explainAgent.explain(arg);
        await ctx.reply(text);
      } catch (error) {
        console.error("Explain error:", error);
        await ctx.reply("Failed to generate explanation. Please try again.");
      }
      return;
    }

    await ctx.reply("Invalid format. Use: /explain 1.3 or /explain 2");
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
        const stats = progress.domainStats[String(q.domain_id)];
        stats.total++;
        if (answered === q.correct_index) stats.correct++;

        const qHash = hashQuestion(q.question_text, q.options);
        progress.history.push({
          domain_id: q.domain_id,
          scenario_id: q.scenario_id,
          task_statement_id: q.task_statement_id,
          correct: answered === q.correct_index,
          difficulty: q.difficulty,
          timestamp: Date.now(),
          question_hash: qHash,
        });
      }
      progress.currentDifficulty = calculateDifficulty(getOverallAccuracy(progress));
      updateCurrentSession(progress);
      saveUserProgress(progress);

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

function formatQuestion(question: ExamQuestion): string {
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
