import dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import { createBot } from "./bot/telegram-bot";

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!TELEGRAM_BOT_TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN is not set in .env");
  process.exit(1);
}

if (!ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set in .env");
  process.exit(1);
}

const anthropicClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
const bot = createBot(TELEGRAM_BOT_TOKEN, anthropicClient);

console.log("Starting bot...");
bot.launch({ dropPendingUpdates: true }).then(() => {
  console.log("CCA-F Exam Bot is running");
}).catch((err) => {
  console.error("Bot launch failed:", err);
  process.exit(1);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
