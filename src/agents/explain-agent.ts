import Anthropic from "@anthropic-ai/sdk";
import { getDomainById, getTaskStatement } from "../domains/domain-definitions";
import { SCENARIOS } from "../domains/scenarios";

export class ExplainAgent {
  private client: Anthropic;

  constructor(client: Anthropic) {
    this.client = client;
  }

  async explain(taskStatementId: string): Promise<string> {
    const [domainIdStr] = taskStatementId.split(".");
    const domainId = parseInt(domainIdStr);
    const domain = getDomainById(domainId);
    const ts = getTaskStatement(domainId, taskStatementId);

    if (!domain || !ts) {
      return `Task statement "${taskStatementId}" not found. Valid range: 1.1-1.7, 2.1-2.5, 3.1-3.6, 4.1-4.6, 5.1-5.6`;
    }

    const relatedScenarios = SCENARIOS.filter((s) =>
      s.primaryDomains.includes(domainId)
    );
    const scenarioContext = relatedScenarios
      .map((s) => `- ${s.name}`)
      .join("\n");

    const systemPrompt = `You are a CCA-F exam tutor. Explain the given topic clearly and concisely.
Use practical examples from production scenarios. Keep the explanation focused and under 400 words.
Write in a mix: technical terms in English, explanations in Russian for better understanding.

IMPORTANT: Output PLAIN TEXT only. Do NOT use any markdown formatting: no **, no ## headers, no \`backticks\`, no \`\`\` code blocks, no bullet symbols like - or *. Use simple numbered lists (1. 2. 3.) and plain text emphasis (e.g., write UPPERCASE for key terms). The output will be displayed in Telegram which does not render markdown.`;

    const userMessage = `Explain this CCA-F exam topic:

Domain ${domain.id}: ${domain.name} (${domain.weight}% of exam)
Task Statement ${ts.id}: ${ts.title}

Knowledge areas:
${ts.knowledgeOf.map((k) => `- ${k}`).join("\n")}

Skills tested:
${ts.skillsIn.map((s) => `- ${s}`).join("\n")}

Related production scenarios:
${scenarioContext}

Give a clear explanation with a practical example. Highlight common mistakes (anti-patterns) and the correct approach.`;

    const response = await this.client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock ? textBlock.text : "Failed to generate explanation.";
  }

  async explainDomain(domainId: number): Promise<string> {
    const domain = getDomainById(domainId);
    if (!domain) return `Domain ${domainId} not found. Valid: 1-5`;

    let text = `Domain ${domain.id}: ${domain.name}\n`;
    text += `Weight: ${domain.weight}% (${domain.questionCount} questions on exam)\n\n`;
    text += `Task Statements:\n`;

    for (const ts of domain.taskStatements) {
      text += `  ${ts.id} — ${ts.title}\n`;
    }

    text += `\nUse /explain <task_id> for detailed explanation.\n`;
    text += `Example: /explain ${domain.taskStatements[0].id}`;

    return text;
  }
}
