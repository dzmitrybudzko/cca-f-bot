export interface Flashcard {
  id: string;
  front: string;
  back: string;
  domain_id: number;
  task_statement_id: string;
}

export const FLASHCARDS: Flashcard[] = [
  // Domain 1: Agentic Architecture & Orchestration
  {
    id: "fc_1_1a",
    front: "In an agentic loop, what field do you inspect to decide whether to continue iterating or stop?",
    back: "stop_reason: check for 'tool_use' (continue loop, process tool calls) vs 'end_turn' (stop, return final response). Never parse natural language or check assistant text content as completion signals.",
    domain_id: 1,
    task_statement_id: "1.1",
  },
  {
    id: "fc_1_1b",
    front: "Name 3 anti-patterns for agentic loop termination.",
    back: "1) Parsing natural language signals ('I'm done')\n2) Arbitrary iteration caps as PRIMARY stopping mechanism\n3) Checking if assistant returned text content as completion indicator\n\nCorrect: use stop_reason field exclusively.",
    domain_id: 1,
    task_statement_id: "1.1",
  },
  {
    id: "fc_1_2",
    front: "In a multi-agent system, what architecture pattern is recommended and why?",
    back: "Hub-and-spoke: coordinator manages ALL inter-subagent communication, error handling, and routing. Subagents have isolated context — they do NOT inherit coordinator's conversation history. Coordinator dynamically selects which subagents to invoke.",
    domain_id: 1,
    task_statement_id: "1.2",
  },
  {
    id: "fc_1_3a",
    front: "How do you spawn subagents in the Agent SDK? What must allowedTools include?",
    back: "Use the Task tool to spawn subagents. allowedTools MUST include 'Task' for a coordinator to invoke subagents. Context must be explicitly provided in the prompt — no automatic parent context inheritance or shared memory.",
    domain_id: 1,
    task_statement_id: "1.3",
  },
  {
    id: "fc_1_3b",
    front: "How do you spawn parallel subagents?",
    back: "Emit multiple Task tool calls in a single coordinator response. Each subagent gets explicit context in its prompt — no shared memory between them.",
    domain_id: 1,
    task_statement_id: "1.3",
  },
  {
    id: "fc_1_4",
    front: "When should you use programmatic enforcement (hooks) vs prompt-based guidance for workflow ordering?",
    back: "Use programmatic enforcement (hooks, prerequisite gates) when deterministic compliance is required (financial/identity operations). Prompt instructions alone have a non-zero failure rate. Use structured handoff summaries when escalating to humans.",
    domain_id: 1,
    task_statement_id: "1.4",
  },
  {
    id: "fc_1_5",
    front: "What are Agent SDK hooks and when should you use them over prompts?",
    back: "Hooks (e.g., PostToolUse) intercept tool results for transformation or intercept outgoing tool calls for policy enforcement. Use hooks over prompts when business rules require GUARANTEED compliance (e.g., blocking refunds > $500). Prompts give probabilistic compliance.",
    domain_id: 1,
    task_statement_id: "1.5",
  },
  {
    id: "fc_1_6",
    front: "When to use prompt chaining (fixed pipeline) vs dynamic adaptive decomposition?",
    back: "Prompt chaining: predictable, sequential reviews (e.g., per-file analysis then cross-file integration). Dynamic decomposition: open-ended tasks where subtasks depend on intermediate findings. For large code reviews: per-file local passes + cross-file integration pass.",
    domain_id: 1,
    task_statement_id: "1.6",
  },
  {
    id: "fc_1_7",
    front: "What is fork_session and when should you prefer a new session over --resume?",
    back: "fork_session creates parallel exploration branches from a shared baseline. Prefer a NEW session with structured summary over --resume when tool results may be stale. Use --resume <session-name> for continuing named investigations. Inform resumed sessions about file changes.",
    domain_id: 1,
    task_statement_id: "1.7",
  },

  // Domain 2: Tool Design & MCP Integration
  {
    id: "fc_2_1",
    front: "What is the PRIMARY mechanism LLMs use for tool selection? What happens with minimal descriptions?",
    back: "Tool descriptions are the primary selection mechanism. Minimal descriptions lead to unreliable selection. Must include: input formats, example queries, edge cases, boundary explanations. Overlapping descriptions cause misrouting.",
    domain_id: 2,
    task_statement_id: "2.1",
  },
  {
    id: "fc_2_2",
    front: "What fields should a structured MCP error response include?",
    back: "1) isError flag (MCP standard)\n2) errorCategory: transient / validation / permission / business\n3) isRetryable: boolean\n4) Human-readable description\n\nDistinguish access failures from valid empty results. Subagents recover locally, propagate only unresolvable errors.",
    domain_id: 2,
    task_statement_id: "2.2",
  },
  {
    id: "fc_2_3a",
    front: "How many tools is too many for a single agent? What are the 3 tool_choice options?",
    back: "18 tools degrades selection reliability; keep to 4-5 per agent. tool_choice options:\n- 'auto': model may return text instead of calling a tool\n- 'any': model MUST call some tool\n- forced: {type: 'tool', name: '...'} — specific tool required",
    domain_id: 2,
    task_statement_id: "2.3",
  },
  {
    id: "fc_2_4",
    front: "Where do you configure MCP servers: project-level vs user-level? How do you reference secrets?",
    back: "Project-level: .mcp.json (shared via version control)\nUser-level: ~/.claude.json (personal)\nSecrets: environment variable expansion ${GITHUB_TOKEN} in .mcp.json\nPrefer community MCP servers over custom for standard integrations.",
    domain_id: 2,
    task_statement_id: "2.4",
  },
  {
    id: "fc_2_5",
    front: "Match built-in tools: Grep, Glob, Read/Write, Edit — what is each for?",
    back: "Grep: search file CONTENTS for patterns (function names, errors)\nGlob: find files by PATH patterns (*.test.tsx)\nRead/Write: full file operations\nEdit: targeted modifications via unique text matching\nFallback: Read + Write when Edit can't find unique anchor text.",
    domain_id: 2,
    task_statement_id: "2.5",
  },

  // Domain 3: Claude Code Configuration & Workflows
  {
    id: "fc_3_1",
    front: "What is the CLAUDE.md hierarchy? (3 levels)",
    back: "1) User-level: ~/.claude/CLAUDE.md (personal, not shared)\n2) Project-level: .claude/CLAUDE.md or root CLAUDE.md\n3) Directory-level: CLAUDE.md in subdirectories\n\n@import syntax for modular config. .claude/rules/ for topic-specific rules. /memory to verify loaded files.",
    domain_id: 3,
    task_statement_id: "3.1",
  },
  {
    id: "fc_3_2",
    front: "Where are custom slash commands vs skills defined? What does context: fork do?",
    back: "Commands: .claude/commands/ (project, version controlled) or ~/.claude/commands/ (personal)\nSkills: .claude/skills/ with SKILL.md frontmatter\ncontext: fork runs the skill in isolated sub-agent context, preventing verbose output from polluting main session.",
    domain_id: 3,
    task_statement_id: "3.2",
  },
  {
    id: "fc_3_3",
    front: "How do path-specific rules work in .claude/rules/?",
    back: "Files in .claude/rules/ with YAML frontmatter containing paths fields with glob patterns (e.g., paths: ['terraform/**/*']). Rules load only when editing matching files. Use glob patterns for cross-directory conventions instead of directory-level CLAUDE.md.",
    domain_id: 3,
    task_statement_id: "3.3",
  },
  {
    id: "fc_3_4",
    front: "When to use plan mode vs direct execution in Claude Code?",
    back: "Plan mode: complex tasks, large-scale changes, architectural decisions, multi-file modifications, multiple valid approaches.\nDirect execution: simple, well-scoped changes (single-file bug fix).\nUse Explore subagent for verbose discovery to prevent context exhaustion.",
    domain_id: 3,
    task_statement_id: "3.4",
  },
  {
    id: "fc_3_5",
    front: "Name 3 iterative refinement techniques for Claude Code.",
    back: "1) Concrete input/output examples for transformation requirements\n2) Test-driven iteration: write tests first, share failures\n3) Interview pattern: Claude asks questions before implementing\nSingle message for interacting issues, sequential for independent ones.",
    domain_id: 3,
    task_statement_id: "3.5",
  },
  {
    id: "fc_3_6",
    front: "How do you run Claude Code in CI/CD? What flags are needed?",
    back: "-p / --print for non-interactive mode (prevents hangs)\n--output-format json + --json-schema for structured CI output\nUse separate instances for review vs generation (context isolation).\nInclude prior review findings to avoid duplicate comments.",
    domain_id: 3,
    task_statement_id: "3.6",
  },

  // Domain 4: Prompt Engineering & Structured Output
  {
    id: "fc_4_1",
    front: "How do you reduce false positives in code review prompts?",
    back: "Use explicit criteria over vague instructions ('flag when behavior contradicts code' vs 'check accuracy'). General 'be conservative' doesn't improve precision. Temporarily disable high false-positive categories to restore developer trust.",
    domain_id: 4,
    task_statement_id: "4.1",
  },
  {
    id: "fc_4_2",
    front: "How many few-shot examples should you use? What should they demonstrate?",
    back: "2-4 targeted examples for ambiguous scenarios showing reasoning. Demonstrate: format, ambiguous-case handling, false positive reduction. Few-shot enables generalization beyond pre-specified cases and reduces hallucination in extraction tasks.",
    domain_id: 4,
    task_statement_id: "4.2",
  },
  {
    id: "fc_4_3a",
    front: "What is the most reliable way to get structured output from Claude? What does it NOT prevent?",
    back: "tool_use with JSON schemas: guaranteed schema-compliant output. Eliminates SYNTAX errors but NOT semantic errors. Use tool_choice 'any' to guarantee a tool is called. Optional/nullable fields prevent fabrication when info is absent.",
    domain_id: 4,
    task_statement_id: "4.3",
  },
  {
    id: "fc_4_3b",
    front: "How to handle extensible categories in JSON schemas?",
    back: "Use enum with 'other' + detail string field. Example: category enum ['bug', 'feature', 'refactor', 'other'] with a category_detail string for 'other' cases. Also use 'unclear' enum value when classification is ambiguous.",
    domain_id: 4,
    task_statement_id: "4.3",
  },
  {
    id: "fc_4_4",
    front: "When are retries effective vs ineffective? What is retry-with-error-feedback?",
    back: "Effective: format/structural errors (append specific validation errors to prompt on retry). Ineffective: when info is absent from source document — retrying won't create missing data. Self-correction: calculated_total vs stated_total, conflict_detected booleans.",
    domain_id: 4,
    task_statement_id: "4.4",
  },
  {
    id: "fc_4_5",
    front: "What is the Message Batches API? When to use it and when NOT?",
    back: "50% cost savings, up to 24h processing, no latency SLA. Good for: overnight reports, weekly audits, nightly test generation. NOT for: blocking pre-merge checks. No multi-turn tool calling. Use custom_id for request/response correlation. Resubmit only failed docs.",
    domain_id: 4,
    task_statement_id: "4.5",
  },
  {
    id: "fc_4_6",
    front: "Why is self-review less effective than independent review? What's the multi-pass pattern?",
    back: "Self-review limitation: model retains reasoning context from generation, less likely to question own decisions. Use independent review instances instead. Multi-pass: per-file local analysis passes + cross-file integration passes.",
    domain_id: 4,
    task_statement_id: "4.6",
  },

  // Domain 5: Context Management & Reliability
  {
    id: "fc_5_1a",
    front: "What is the 'lost in the middle' effect? How do you mitigate it?",
    back: "Models reliably process content at beginning and end of long inputs but may miss middle sections. Mitigation: place key findings summaries at the BEGINNING. Use explicit section headers. Extract 'case facts' block included in each prompt.",
    domain_id: 5,
    task_statement_id: "5.1",
  },
  {
    id: "fc_5_1b",
    front: "What are the risks of progressive summarization?",
    back: "Condensing loses numerical values, percentages, dates into vague summaries. Mitigation: extract transactional facts into persistent 'case facts' block. Trim verbose tool outputs to relevant fields. Require metadata (dates, source locations) in structured outputs.",
    domain_id: 5,
    task_statement_id: "5.1",
  },
  {
    id: "fc_5_2",
    front: "What are reliable vs unreliable escalation triggers?",
    back: "Reliable: customer explicitly requests human, policy exceptions/gaps, no progress after attempts.\nUnreliable: sentiment-based escalation, self-reported confidence scores.\nMultiple customer matches: ask for additional identifiers, don't select heuristically.",
    domain_id: 5,
    task_statement_id: "5.2",
  },
  {
    id: "fc_5_3",
    front: "How should errors propagate in multi-agent systems? Name 2 anti-patterns.",
    back: "Return structured error context: failure type, attempted query, partial results, alternatives. Distinguish access failures from valid empty results.\nAnti-patterns: 1) Silently suppressing errors 2) Terminating entire workflow on single failure.\nSubagents recover locally, propagate only unresolvable errors.",
    domain_id: 5,
    task_statement_id: "5.3",
  },
  {
    id: "fc_5_4",
    front: "How do you manage context in extended codebase exploration sessions?",
    back: "Signs of degradation: inconsistent answers, referencing 'typical patterns' instead of specifics. Solutions: scratchpad files for persisting findings, subagent delegation for verbose exploration, /compact to reduce context, structured state persistence (manifests) for crash recovery.",
    domain_id: 5,
    task_statement_id: "5.4",
  },
  {
    id: "fc_5_5",
    front: "Why can aggregate accuracy be misleading? What's the better approach?",
    back: "Aggregate metrics mask poor performance on specific document types or fields. Better: stratified random sampling for error rates, field-level confidence scores calibrated with labeled validation sets. Validate accuracy by document type AND field before automating.",
    domain_id: 5,
    task_statement_id: "5.5",
  },
  {
    id: "fc_5_6",
    front: "How do you preserve information provenance in multi-source synthesis?",
    back: "Require claim-source mappings (source URLs, document names, excerpts). Handle conflicting statistics: annotate conflicts with source attribution, don't silently pick one. Require publication/collection dates. Render by content type: financials as tables, news as prose.",
    domain_id: 5,
    task_statement_id: "5.6",
  },
];

export function getFlashcardById(id: string): Flashcard | undefined {
  return FLASHCARDS.find((fc) => fc.id === id);
}

export function getFlashcardsByDomain(domainId: number): Flashcard[] {
  return FLASHCARDS.filter((fc) => fc.domain_id === domainId);
}
