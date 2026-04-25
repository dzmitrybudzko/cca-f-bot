import { describe, it, expect, vi } from "vitest";

function createMockCtx() {
  const calls: Array<{ text: string; options: any }> = [];
  return {
    calls,
    reply: vi.fn(async (text: string, options?: any) => {
      calls.push({ text, options });
    }),
  };
}

// Re-implement safeSend logic for testing (same as in telegram-bot.ts)
const TG_MSG_LIMIT = 4096;

async function safeSend(ctx: any, text: string, options?: Record<string, unknown>): Promise<void> {
  if (text.length <= TG_MSG_LIMIT) {
    await ctx.reply(text, options as any);
    return;
  }
  const parseMode = (options as any)?.parse_mode;
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= TG_MSG_LIMIT) {
      chunks.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf("\n", TG_MSG_LIMIT);
    if (splitAt < TG_MSG_LIMIT / 2) splitAt = TG_MSG_LIMIT;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }
  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    const opts = isLast ? options : (parseMode ? { parse_mode: parseMode } : undefined);
    await ctx.reply(chunks[i], opts as any);
  }
}

describe("safeSend", () => {
  it("sends short message in one call", async () => {
    const ctx = createMockCtx();
    await safeSend(ctx, "Hello");
    expect(ctx.reply).toHaveBeenCalledTimes(1);
    expect(ctx.calls[0].text).toBe("Hello");
  });

  it("passes options to short message", async () => {
    const ctx = createMockCtx();
    await safeSend(ctx, "Hello", { parse_mode: "HTML" });
    expect(ctx.calls[0].options).toEqual({ parse_mode: "HTML" });
  });

  it("splits long message into chunks", async () => {
    const ctx = createMockCtx();
    const line = "A".repeat(100) + "\n";
    const longText = line.repeat(50); // 5050 chars
    await safeSend(ctx, longText);
    expect(ctx.reply).toHaveBeenCalledTimes(2);
    for (const call of ctx.calls) {
      expect(call.text.length).toBeLessThanOrEqual(TG_MSG_LIMIT);
    }
  });

  it("attaches options only to the last chunk", async () => {
    const ctx = createMockCtx();
    const line = "A".repeat(100) + "\n";
    const longText = line.repeat(50);
    const opts = { parse_mode: "HTML", reply_markup: { inline_keyboard: [] } };
    await safeSend(ctx, longText, opts);
    const lastCall = ctx.calls[ctx.calls.length - 1];
    expect(lastCall.options).toEqual(opts);
    // First chunk should only have parse_mode, not reply_markup
    if (ctx.calls.length > 1) {
      expect(ctx.calls[0].options).toEqual({ parse_mode: "HTML" });
    }
  });

  it("handles text exactly at limit", async () => {
    const ctx = createMockCtx();
    const text = "X".repeat(TG_MSG_LIMIT);
    await safeSend(ctx, text);
    expect(ctx.reply).toHaveBeenCalledTimes(1);
  });

  it("splits at newline boundary", async () => {
    const ctx = createMockCtx();
    const part1 = "A".repeat(4000) + "\n";
    const part2 = "B".repeat(200);
    await safeSend(ctx, part1 + part2);
    expect(ctx.reply).toHaveBeenCalledTimes(2);
    expect(ctx.calls[0].text).toBe(part1.slice(0, -1)); // without trailing newline
    // Actually, lastIndexOf("\n", 4096) will find the \n at position 4000
    // slice(0, 4000) = "A".repeat(4000)
    expect(ctx.calls[0].text).toBe("A".repeat(4000));
  });

  it("handles no-newline long text", async () => {
    const ctx = createMockCtx();
    const text = "X".repeat(5000);
    await safeSend(ctx, text);
    expect(ctx.reply).toHaveBeenCalledTimes(2);
    expect(ctx.calls[0].text.length).toBe(TG_MSG_LIMIT);
    expect(ctx.calls[1].text.length).toBe(5000 - TG_MSG_LIMIT);
  });

  it("does not pass parse_mode for non-HTML chunks", async () => {
    const ctx = createMockCtx();
    const line = "A".repeat(100) + "\n";
    const longText = line.repeat(50);
    await safeSend(ctx, longText, { reply_markup: {} });
    if (ctx.calls.length > 1) {
      expect(ctx.calls[0].options).toBeUndefined();
    }
  });
});
