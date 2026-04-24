import { Markup } from "telegraf";

export function answerKeyboard(questionId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("A", `answer:${questionId}:0`),
      Markup.button.callback("B", `answer:${questionId}:1`),
      Markup.button.callback("C", `answer:${questionId}:2`),
      Markup.button.callback("D", `answer:${questionId}:3`),
    ],
  ]);
}

export function examStartKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("Start Exam", "exam:start"),
      Markup.button.callback("Cancel", "exam:cancel"),
    ],
  ]);
}

export function domainKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("D1: Agentic Arch", "domain:1"),
      Markup.button.callback("D2: Tool/MCP", "domain:2"),
    ],
    [
      Markup.button.callback("D3: Claude Code", "domain:3"),
      Markup.button.callback("D4: Prompting", "domain:4"),
    ],
    [Markup.button.callback("D5: Context/Reliability", "domain:5")],
  ]);
}
