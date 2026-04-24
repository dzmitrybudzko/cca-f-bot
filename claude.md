# CCA-F Exam Bot - Claude Code Configuration

## Project Context
Building an AI-powered Telegram bot for Claude Certified Architect Foundations (CCA-F) exam preparation. Strict adherence to official Anthropic CCA-F Certification Exam Guide (Version 0.1, Feb 10 2025).

**User Goal:** Achieve 1000+ scaled score (passing is 720) through adaptive, scenario-grounded questions.

## Exam Structure (Official)
- **Format:** 60 multiple-choice questions, 120 minutes, closed-book, no AI assistance during actual exam
- **Response type:** Single correct answer + 3 distractors. No penalty for guessing.
- **Scenarios:** 4 randomly selected from 6 production-grade scenarios during exam
- **Scoring:** Scaled score 100-1000 (passing: 720). Scaled scoring equates scores across exam forms of different difficulty.
- **Target Candidate:** Solution architect with 6+ months hands-on experience building with Claude APIs, Agent SDK, Claude Code, and MCP.
- **Domain Weights:**
  - Domain 1: Agentic Architecture & Orchestration (27%)
  - Domain 2: Tool Design & MCP Integration (18%)
  - Domain 3: Claude Code Configuration & Workflows (20%)
  - Domain 4: Prompt Engineering & Structured Output (20%)
  - Domain 5: Context Management & Reliability (15%)

## Core Requirements

### 1. Scenario-Grounded Question Generation
**MANDATORY:** Every question MUST be grounded in one of 6 production scenarios:

| # | Scenario | Primary Domains |
|---|----------|----------------|
| 1 | Customer Support Resolution Agent | D1, D2, D5 |
| 2 | Code Generation with Claude Code | D3, D5 |
| 3 | Multi-Agent Research System | D1, D2, D5 |
| 4 | Developer Productivity with Claude | D2, D3, D1 |
| 5 | Claude Code for Continuous Integration | D3, D4 |
| 6 | Structured Data Extraction | D4, D5 |

**Implementation Rule:** When generating questions, explicitly pass `scenario_id` to Claude with scenario description AND primary domains from official guide.

### 2. Anti-Pattern Recognition (7 Critical Patterns)
These MUST appear as distractors in questions:

| # | Anti-Pattern | Correct Approach | Related Task Statement |
|---|-------------|-----------------|----------------------|
| 1 | Assuming shared memory in multi-agent systems | Explicit context passing | 1.3 |
| 2 | Tool descriptions that are too minimal | Include formats, examples, boundaries | 2.1 |
| 3 | Always using plan mode in Claude Code | Reserve for architectural decisions | 3.4 |
| 4 | Not using JSON Schema for structured outputs | Enforce via tool_use | 4.3 |
| 5 | Putting all context at end of prompt | Place summaries at beginning (lost-in-middle effect) | 5.1 |
| 6 | Not isolating subagent context | Explicit scoping | 1.3 |
| 7 | Trusting agentic loops without validation | Implement self-correction loops | 4.4 |

**Implementation:** Mark distractor options with tags indicating which anti-pattern they represent.

### 3. Agentic Loop Pattern (Domain 1 Critical)
Questions MUST test understanding of:
- `stop_reason` handling: "tool_use" vs "end_turn"
- Tool results appended to conversation history
- Loop termination conditions
- Avoiding anti-patterns: parsing natural language signals, arbitrary iteration caps, checking assistant text content as completion indicator

### 4. Context Management (Domain 5 Critical)
- "Lost in the middle" effect: content at middle of long inputs gets missed
- Explicit context passing required (no shared memory between subagents)
- Structured fact extraction from verbose tool outputs (trim to relevant fields)
- Progressive summarization risks: don't lose numerical values, dates, percentages
- Persistent "case facts" block included in each prompt, outside summarized history
- Scratchpad files for persisting key findings across context boundaries

### 5. Tool Design (Domain 2 Critical)
Tool descriptions are PRIMARY mechanism for tool selection.
**Requirements:**
- Include input formats, example queries, edge cases, boundary explanations
- If two tools have overlapping descriptions -> model guesses (test anti-pattern)
- Splitting vs consolidating: domain-specific decision
- Structured error responses: `errorCategory` (transient/validation/permission/business), `isRetryable`, human-readable description
- MCP `isError` flag for communicating tool failures back to agent
- Distinguish access failures from valid empty results

## Domain Task Statements (Complete from PDF)

### Domain 1: Agentic Architecture & Orchestration (27%)
- **1.1** Design and implement agentic loops for autonomous task execution
  - stop_reason lifecycle, tool result appending, model-driven vs pre-configured decisions
- **1.2** Orchestrate multi-agent systems with coordinator-subagent patterns
  - Hub-and-spoke architecture, isolated subagent context, dynamic subagent selection, risk of overly narrow task decomposition
- **1.3** Configure subagent invocation, context passing, and spawning
  - Task tool for spawning, allowedTools must include "Task", explicit context in prompt, AgentDefinition config, fork_session
  - Parallel subagents via multiple Task tool calls in single coordinator response
- **1.4** Implement multi-step workflows with enforcement and handoff patterns
  - Programmatic enforcement (hooks, prerequisite gates) vs prompt-based guidance
  - Deterministic compliance required for financial/identity operations
  - Structured handoff summaries for human escalation
- **1.5** Apply Agent SDK hooks for tool call interception and data normalization
  - PostToolUse hooks for data normalization (timestamps, status codes)
  - Tool call interception for policy enforcement (e.g., blocking refunds > $500)
  - Hooks over prompts when business rules require guaranteed compliance
- **1.6** Design task decomposition strategies for complex workflows
  - Fixed sequential pipelines (prompt chaining) vs dynamic adaptive decomposition
  - Per-file local analysis + cross-file integration pass for large code reviews
  - Adaptive investigation plans for open-ended tasks
- **1.7** Manage session state, resumption, and forking
  - `--resume <session-name>` for named sessions
  - `fork_session` for parallel exploration branches
  - New session with structured summary vs resuming with stale tool results

### Domain 2: Tool Design & MCP Integration (18%)
- **2.1** Design effective tool interfaces with clear descriptions and boundaries
  - Tool descriptions as primary selection mechanism
  - Rename tools to eliminate functional overlap
  - Split generic tools into purpose-specific tools
- **2.2** Implement structured error responses for MCP tools
  - isError flag, errorCategory, isRetryable, human-readable descriptions
  - Transient vs validation vs business vs permission errors
  - Local recovery in subagents, propagate only unresolvable errors with partial results
- **2.3** Distribute tools appropriately across agents and configure tool choice
  - Too many tools (18 vs 4-5) degrades selection reliability
  - tool_choice: "auto" | "any" | forced `{"type": "tool", "name": "..."}`
  - Scoped cross-role tools for high-frequency needs
- **2.4** Integrate MCP servers into Claude Code and agent workflows
  - Project-level `.mcp.json` vs user-level `~/.claude.json`
  - Environment variable expansion: `${GITHUB_TOKEN}`
  - MCP resources for content catalogs (reduce exploratory tool calls)
  - Prefer community MCP servers over custom for standard integrations
- **2.5** Select and apply built-in tools effectively
  - Grep for content search, Glob for file path patterns
  - Read/Write for full file ops, Edit for targeted modifications
  - Edit fallback: Read + Write when non-unique text matches
  - Incremental codebase understanding: Grep -> Read -> trace imports

### Domain 3: Claude Code Configuration & Workflows (20%)
- **3.1** Configure CLAUDE.md files with appropriate hierarchy
  - Hierarchy: user-level `~/.claude/CLAUDE.md`, project-level `.claude/CLAUDE.md` or root, directory-level
  - `@import` syntax for modular configuration
  - `.claude/rules/` directory for topic-specific rule files
  - `/memory` command to verify loaded memory files
- **3.2** Create and configure custom slash commands and skills
  - Project-scoped `.claude/commands/` (version controlled) vs user-scoped `~/.claude/commands/`
  - Skills in `.claude/skills/` with SKILL.md frontmatter: `context: fork`, `allowed-tools`, `argument-hint`
  - `context: fork` prevents skill output from polluting main conversation
- **3.3** Apply path-specific rules for conditional convention loading
  - `.claude/rules/` files with YAML frontmatter `paths` fields containing glob patterns
  - Glob-pattern rules vs directory-level CLAUDE.md for cross-directory conventions
- **3.4** Determine when to use plan mode vs direct execution
  - Plan mode: complex tasks, large-scale changes, architectural decisions, multi-file modifications
  - Direct execution: simple, well-scoped changes (single-file bug fix)
  - Explore subagent for isolating verbose discovery output
- **3.5** Apply iterative refinement techniques
  - Concrete input/output examples for transformation requirements
  - Test-driven iteration: write tests first, share failures
  - Interview pattern: Claude asks questions before implementing
  - Single message for interacting issues, sequential for independent
- **3.6** Integrate Claude Code into CI/CD pipelines
  - `-p` / `--print` flag for non-interactive mode
  - `--output-format json` + `--json-schema` for structured CI output
  - Session context isolation: separate instance for review vs generation
  - Include prior review findings to avoid duplicate comments
  - CLAUDE.md for testing standards in CI

### Domain 4: Prompt Engineering & Structured Output (20%)
- **4.1** Design prompts with explicit criteria to improve precision
  - Explicit criteria over vague instructions ("flag when behavior contradicts code" vs "check accuracy")
  - Temporarily disable high false-positive categories to restore trust
- **4.2** Apply few-shot prompting for output consistency
  - 2-4 targeted examples for ambiguous scenarios showing reasoning
  - Demonstrate format, ambiguous-case handling, false positive reduction
  - Few-shot enables generalization beyond pre-specified cases
- **4.3** Enforce structured output using tool use and JSON schemas
  - tool_use with JSON schemas: guaranteed schema compliance, eliminates syntax errors
  - tool_choice: "auto" (may return text), "any" (must call tool), forced (specific tool)
  - Strict schemas eliminate syntax errors but NOT semantic errors
  - Optional/nullable fields prevent fabrication when info absent
  - Enum with "other" + detail string for extensible categories
- **4.4** Implement validation, retry, and feedback loops
  - Retry-with-error-feedback: append specific validation errors to prompt
  - Retries ineffective when info absent from source (vs format errors)
  - detected_pattern field for dismissal pattern analysis
  - Self-correction: calculated_total vs stated_total, conflict_detected booleans
- **4.5** Design efficient batch processing strategies
  - Message Batches API: 50% cost savings, up to 24h processing, no latency SLA
  - Appropriate for: overnight reports, weekly audits, nightly test generation
  - NOT for: blocking pre-merge checks
  - No multi-turn tool calling within single batch request
  - custom_id for request/response correlation
  - Resubmit only failed documents (by custom_id) with modifications
- **4.6** Design multi-instance and multi-pass review architectures
  - Self-review limitation: model retains reasoning context from generation
  - Independent review instances more effective than self-review
  - Per-file local passes + cross-file integration passes

### Domain 5: Context Management & Reliability (15%)
- **5.1** Manage conversation context across long interactions
  - Progressive summarization risks: losing numerical values, dates, percentages
  - "Lost in the middle" effect: reliable at beginning/end, may miss middle
  - Tool results accumulate and consume tokens disproportionately
  - Extract "case facts" block, trim verbose outputs, place summaries at beginning
- **5.2** Design effective escalation and ambiguity resolution
  - Escalation triggers: customer requests human, policy exceptions/gaps, no progress
  - Sentiment-based escalation and self-reported confidence are unreliable
  - Multiple customer matches -> ask for additional identifiers, don't select heuristically
  - Honor explicit human requests immediately
- **5.3** Implement error propagation across multi-agent systems
  - Structured error context: failure type, attempted query, partial results, alternatives
  - Distinguish access failures from valid empty results
  - Silently suppressing errors or terminating entire workflows are both anti-patterns
  - Coverage annotations in synthesis (well-supported vs gaps)
- **5.4** Manage context in large codebase exploration
  - Context degradation in extended sessions
  - Scratchpad files for persisting findings across context boundaries
  - Subagent delegation for verbose exploration
  - Structured state persistence for crash recovery (manifests)
  - `/compact` to reduce context usage
- **5.5** Design human review workflows and confidence calibration
  - Aggregate accuracy can mask poor performance on specific types/fields
  - Stratified random sampling for error rate measurement
  - Field-level confidence scores calibrated with labeled validation sets
  - Validate accuracy by document type and field before automating
- **5.6** Preserve information provenance in multi-source synthesis
  - Claim-source mappings lost during summarization
  - Handle conflicting statistics: annotate conflicts with source attribution
  - Require publication/collection dates to prevent temporal misinterpretation
  - Render different content types appropriately (tables, prose, lists)

## Out-of-Scope Topics (DO NOT generate questions on these)
- Fine-tuning or training custom models
- API authentication, billing, account management
- Deploying/hosting MCP servers (infrastructure, networking, containers)
- Claude's internal architecture, training process, model weights
- Constitutional AI, RLHF, safety training
- Embeddings or vector databases
- Computer use (browser automation, desktop interaction)
- Vision/image analysis
- Streaming API or server-sent events
- Rate limiting, quotas, API pricing
- OAuth, API key rotation, authentication protocols
- Cloud provider configurations (AWS, GCP, Azure)
- Performance benchmarking or model comparison
- Prompt caching implementation details
- Token counting algorithms or tokenization

## Technologies & Concepts (Appendix from PDF)
- **Claude Agent SDK:** Agent definitions, agentic loops, stop_reason, hooks (PostToolUse, tool call interception), subagent spawning via Task tool, allowedTools
- **MCP:** MCP servers, tools, resources, isError flag, tool descriptions, .mcp.json, env var expansion
- **Claude Code:** CLAUDE.md hierarchy, .claude/rules/ with YAML frontmatter, .claude/commands/, .claude/skills/ with SKILL.md (context:fork, allowed-tools, argument-hint), plan mode, /memory, /compact, --resume, fork_session, Explore subagent
- **Claude Code CLI:** -p/--print, --output-format json, --json-schema
- **Claude API:** tool_use with JSON schemas, tool_choice ("auto"/"any"/forced), stop_reason ("tool_use"/"end_turn"), max_tokens, system prompts
- **Message Batches API:** 50% cost, 24h window, custom_id, no multi-turn tool calling
- **JSON Schema:** Required vs optional, enum, nullable, "other" + detail string, strict mode
- **Pydantic:** Schema validation, semantic validation errors, validation-retry loops
- **Built-in tools:** Read, Write, Edit, Bash, Grep, Glob
- **Few-shot prompting:** Targeted examples, format demonstration, generalization
- **Prompt chaining:** Sequential task decomposition into focused passes
- **Context window management:** Token budgets, progressive summarization, lost-in-middle, scratchpad files
- **Session management:** Resumption, fork_session, named sessions, context isolation
- **Confidence scoring:** Field-level confidence, calibration with labeled sets, stratified sampling

## Code Structure Requirements

### TypeScript Coding Standards
- Use `async/await` for all async operations
- Strong typing: avoid `any`, use generics where appropriate
- Error handling: structured error responses with `errorCategory`, `isRetryable`

### Module Organization
```
src/
├── index.ts                       # Entry point: dotenv, Anthropic SDK, Telegraf init
├── agents/
│   ├── exam-agent.ts              # CCAExamAgent - question generation via tool_use
│   ├── adaptive-agent.ts          # AdaptiveStudyAgent - gap analysis & difficulty
│   └── mock-exam-simulator.ts     # Full 60-question exam simulation
├── domains/
│   ├── domain-definitions.ts      # 5 domains with task statements from PDF
│   └── scenarios.ts               # 6 production scenarios with primary domains
├── models/
│   ├── exam-question.ts           # ExamQuestion type
│   ├── user-progress.ts           # UserProgress tracking
│   └── study-recommendation.ts    # StudyRecommendation
├── knowledge-base/
│   ├── cca-knowledge.ts           # 29 task statements, technologies, in/out-of-scope
│   └── sample-questions.ts        # 12 sample questions from PDF for calibration
├── anti-patterns/
│   └── seven-patterns.ts          # 7 critical anti-patterns with task statement mapping
├── bot/
│   ├── telegram-bot.ts            # Telegraf bot: commands, callbacks, state
│   └── keyboards.ts               # Inline keyboards for answer options
└── utils/
    └── validation.ts              # ExamQuestion validation
```

## Agentic Loop Requirements (Critical for Domain 1)

When implementing agentic loops:

1. **Check stop_reason correctly:**
```typescript
if (response.stop_reason === "tool_use") {
  // Process tool calls and loop
} else if (response.stop_reason === "end_turn") {
  // Return final response
}
```

2. **Append tool results to conversation history** for next iteration
3. **Never use:**
   - Parsing natural language signals for loop termination
   - Arbitrary iteration caps as primary stopping mechanism
   - Checking for assistant text content as completion indicator

## Question Generation Requirements

### System Prompt Template
```
You are a Claude Certified Architect exam question generator.
Your task is to create realistic, production-grade scenario-based questions.

MANDATORY RULES:
- Question MUST be scenario-grounded in [SCENARIO_NAME]: [SCENARIO_DESCRIPTION]
- Question MUST test Domain [DOMAIN_NUMBER]: [DOMAIN_NAME], Task Statement [TASK_ID]
- Distractors must be REAL architectural anti-patterns from the official guide
- Correct answer demonstrates sound engineering judgment
- Include precise terminology (stop_reason, CLAUDE.md, tool_choice, etc.)
- DO NOT generate questions on out-of-scope topics

TASK STATEMENT CONTEXT:
Knowledge of: [KNOWLEDGE_ITEMS]
Skills in: [SKILL_ITEMS]
```

### Output Schema (enforced via tool_use)
```json
{
  "question_text": "...",
  "options": ["A text", "B text", "C text", "D text"],
  "correct_index": 0-3,
  "explanation": "Why correct + why each distractor fails",
  "key_concept": "...",
  "domain_id": 1-5,
  "scenario_id": 1-6,
  "task_statement_id": "1.1",
  "difficulty": "easy|medium|hard",
  "anti_patterns_in_distractors": ["pattern_id", ...]
}
```

### Difficulty Calibration
```typescript
function calculateDifficulty(userAccuracy: number): "easy" | "medium" | "hard" {
  if (userAccuracy < 60) return "easy";
  if (userAccuracy < 75) return "medium";
  return "hard";
}
```

### Mock Exam Distribution (60 questions by domain weight)
| Domain | Weight | Questions |
|--------|--------|-----------|
| D1: Agentic Architecture | 27% | 16 |
| D2: Tool Design & MCP | 18% | 11 |
| D3: Claude Code & Workflows | 20% | 12 |
| D4: Prompt Engineering | 20% | 12 |
| D5: Context & Reliability | 15% | 9 |

## Testing Strategy

Before any generation:
1. Validate question has exactly 4 options
2. Validate correct_index is 0-3
3. Validate scenario_id is one of 6 official scenarios
4. Validate domain_id is 1-5
5. Validate task_statement_id matches domain
6. Validate explanation includes WHY correct and why distractors fail
7. Validate question does NOT cover out-of-scope topics

## References
- Official: Claude Certified Architect - Foundations Certification Exam Guide (Version 0.1, Feb 10 2025)
- PDF file: `instructor_8lsy243ftffjjy1cx9lm3o2bw_public_1773274827_Claude+Certified+Architect+–+Foundations+Certification+Exam+Guide.pdf`
- Source: Anthropic PBC, Confidential
- 12 sample questions from PDF pages 25-33 for format/difficulty calibration

## Important Notes for Claude Code Sessions
When working on this project:
1. Always validate generated questions against all 6 scenarios
2. Track domain distribution to ensure balanced coverage matching official weights
3. Test difficulty calibration against user_accuracy metric
4. Refer to anti-patterns when creating distractor options
5. Use explicit scenario context and task statement details from guide, not assumptions
6. Use tool_use with JSON schema for guaranteed structured output (not text parsing)
7. Reference sample questions for calibration of difficulty and format
