export interface AntiPattern {
  id: string;
  name: string;
  mistake: string;
  correctApproach: string;
  relatedTaskStatement: string;
}

export const ANTI_PATTERNS: AntiPattern[] = [
  {
    id: "AP1",
    name: "Shared memory assumption",
    mistake:
      "Assuming shared memory in multi-agent systems — expecting subagents to automatically inherit parent context or share state between invocations",
    correctApproach:
      "Explicit context passing: include complete findings from prior agents directly in the subagent's prompt using structured data formats",
    relatedTaskStatement: "1.3",
  },
  {
    id: "AP2",
    name: "Minimal tool descriptions",
    mistake:
      "Tool descriptions that are too minimal — using descriptions like 'Retrieves customer information' without input formats, examples, or boundary explanations",
    correctApproach:
      "Include input formats, example queries, edge cases, and boundary explanations in tool descriptions. Rename and differentiate overlapping tools.",
    relatedTaskStatement: "2.1",
  },
  {
    id: "AP3",
    name: "Overuse of plan mode",
    mistake:
      "Always using plan mode in Claude Code — entering plan mode for simple, well-scoped changes that don't require architectural exploration",
    correctApproach:
      "Reserve plan mode for complex tasks with architectural implications, multiple valid approaches, or multi-file modifications. Use direct execution for simple, well-understood changes.",
    relatedTaskStatement: "3.4",
  },
  {
    id: "AP4",
    name: "No JSON Schema enforcement",
    mistake:
      "Not using JSON Schema for structured outputs — relying on text-based parsing or hoping the model returns valid JSON",
    correctApproach:
      "Enforce structured output via tool_use with JSON schemas for guaranteed schema compliance. Use tool_choice to control when tools are called.",
    relatedTaskStatement: "4.3",
  },
  {
    id: "AP5",
    name: "Poor context positioning",
    mistake:
      "Putting all context at the end of the prompt — placing critical information in the middle or end of long inputs where the 'lost in the middle' effect causes omissions",
    correctApproach:
      "Place key findings summaries at the beginning of aggregated inputs. Organize detailed results with explicit section headers to mitigate position effects.",
    relatedTaskStatement: "5.1",
  },
  {
    id: "AP6",
    name: "Non-isolated subagent context",
    mistake:
      "Not isolating subagent context — allowing subagent outputs to pollute main conversation, or expecting subagents to have access to coordinator's full context",
    correctApproach:
      "Explicit scoping: subagents receive only the context they need via their prompt. Use context: fork for skills. Route all communication through the coordinator.",
    relatedTaskStatement: "1.3",
  },
  {
    id: "AP7",
    name: "Unvalidated agentic loops",
    mistake:
      "Trusting agentic loops without validation — no self-correction mechanisms, no validation of intermediate outputs, no retry-with-feedback loops",
    correctApproach:
      "Implement validation-retry loops: append specific validation errors to prompt on retry. Use self-correction patterns (calculated_total vs stated_total). Add detected_pattern fields for analysis.",
    relatedTaskStatement: "4.4",
  },
];

export function getAntiPatternById(id: string): AntiPattern | undefined {
  return ANTI_PATTERNS.find((ap) => ap.id === id);
}

export function getAntiPatternsForTaskStatement(
  taskStatementId: string
): AntiPattern[] {
  return ANTI_PATTERNS.filter(
    (ap) => ap.relatedTaskStatement === taskStatementId
  );
}
