export interface TaskStatement {
  id: string;
  title: string;
  knowledgeOf: string[];
  skillsIn: string[];
}

export interface Domain {
  id: number;
  name: string;
  weight: number;
  questionCount: number;
  taskStatements: TaskStatement[];
}

export const DOMAINS: Domain[] = [
  {
    id: 1,
    name: "Agentic Architecture & Orchestration",
    weight: 27,
    questionCount: 16,
    taskStatements: [
      {
        id: "1.1",
        title: "Design and implement agentic loops for autonomous task execution",
        knowledgeOf: [
          "The agentic loop lifecycle: sending requests to Claude, inspecting stop_reason ('tool_use' vs 'end_turn'), executing requested tools, and returning results for the next iteration",
          "How tool results are appended to conversation history so the model can reason about the next action",
          "The distinction between model-driven decision-making and pre-configured decision trees or tool sequences",
        ],
        skillsIn: [
          "Implementing agentic loop control flow that continues when stop_reason is 'tool_use' and terminates when stop_reason is 'end_turn'",
          "Adding tool results to conversation context between iterations so the model can incorporate new information",
          "Avoiding anti-patterns: parsing natural language signals for loop termination, arbitrary iteration caps as primary stopping mechanism, checking assistant text content as completion indicator",
        ],
      },
      {
        id: "1.2",
        title: "Orchestrate multi-agent systems with coordinator-subagent patterns",
        knowledgeOf: [
          "Hub-and-spoke architecture where a coordinator manages all inter-subagent communication, error handling, and information routing",
          "Subagents operate with isolated context—they do not inherit the coordinator's conversation history automatically",
          "The coordinator's role in task decomposition, delegation, result aggregation, and deciding which subagents to invoke",
          "Risks of overly narrow task decomposition leading to incomplete coverage",
        ],
        skillsIn: [
          "Designing coordinator agents that dynamically select which subagents to invoke rather than always routing through the full pipeline",
          "Partitioning research scope across subagents to minimize duplication",
          "Implementing iterative refinement loops where coordinator evaluates synthesis for gaps and re-delegates",
          "Routing all subagent communication through the coordinator for observability and consistent error handling",
        ],
      },
      {
        id: "1.3",
        title: "Configure subagent invocation, context passing, and spawning",
        knowledgeOf: [
          "The Task tool as the mechanism for spawning subagents; allowedTools must include 'Task' for a coordinator to invoke subagents",
          "Subagent context must be explicitly provided in the prompt—no automatic parent context inheritance or shared memory",
          "AgentDefinition configuration including descriptions, system prompts, and tool restrictions",
          "Fork-based session management for exploring divergent approaches from a shared analysis baseline",
        ],
        skillsIn: [
          "Including complete findings from prior agents directly in the subagent's prompt",
          "Using structured data formats to separate content from metadata (source URLs, document names, page numbers)",
          "Spawning parallel subagents by emitting multiple Task tool calls in a single coordinator response",
          "Designing coordinator prompts that specify research goals and quality criteria rather than step-by-step instructions",
        ],
      },
      {
        id: "1.4",
        title: "Implement multi-step workflows with enforcement and handoff patterns",
        knowledgeOf: [
          "The difference between programmatic enforcement (hooks, prerequisite gates) and prompt-based guidance for workflow ordering",
          "When deterministic compliance is required, prompt instructions alone have a non-zero failure rate",
          "Structured handoff protocols for mid-process escalation including customer details, root cause, and recommended actions",
        ],
        skillsIn: [
          "Implementing programmatic prerequisites that block downstream tool calls until prerequisite steps complete",
          "Decomposing multi-concern customer requests into distinct items, investigating each in parallel",
          "Compiling structured handoff summaries when escalating to human agents",
        ],
      },
      {
        id: "1.5",
        title: "Apply Agent SDK hooks for tool call interception and data normalization",
        knowledgeOf: [
          "Hook patterns (e.g., PostToolUse) that intercept tool results for transformation before the model processes them",
          "Hook patterns that intercept outgoing tool calls to enforce compliance rules",
          "The distinction between hooks for deterministic guarantees versus prompt instructions for probabilistic compliance",
        ],
        skillsIn: [
          "Implementing PostToolUse hooks to normalize heterogeneous data formats (Unix timestamps, ISO 8601, numeric status codes)",
          "Implementing tool call interception hooks that block policy-violating actions and redirect to alternative workflows",
          "Choosing hooks over prompt-based enforcement when business rules require guaranteed compliance",
        ],
      },
      {
        id: "1.6",
        title: "Design task decomposition strategies for complex workflows",
        knowledgeOf: [
          "When to use fixed sequential pipelines (prompt chaining) versus dynamic adaptive decomposition",
          "Prompt chaining patterns that break reviews into sequential steps",
          "The value of adaptive investigation plans that generate subtasks based on intermediate findings",
        ],
        skillsIn: [
          "Selecting appropriate decomposition patterns: prompt chaining for predictable reviews, dynamic decomposition for open-ended tasks",
          "Splitting large code reviews into per-file local analysis plus separate cross-file integration pass",
          "Decomposing open-ended tasks by first mapping structure, identifying high-impact areas, then creating a prioritized plan",
        ],
      },
      {
        id: "1.7",
        title: "Manage session state, resumption, and forking",
        knowledgeOf: [
          "Named session resumption using --resume <session-name>",
          "fork_session for creating independent branches from a shared analysis baseline",
          "The importance of informing the agent about changes to previously analyzed files when resuming",
          "Why starting a new session with a structured summary is more reliable than resuming with stale tool results",
        ],
        skillsIn: [
          "Using --resume with session names to continue named investigation sessions",
          "Using fork_session to create parallel exploration branches",
          "Choosing between session resumption and starting fresh with injected summaries",
          "Informing a resumed session about specific file changes for targeted re-analysis",
        ],
      },
    ],
  },
  {
    id: 2,
    name: "Tool Design & MCP Integration",
    weight: 18,
    questionCount: 11,
    taskStatements: [
      {
        id: "2.1",
        title: "Design effective tool interfaces with clear descriptions and boundaries",
        knowledgeOf: [
          "Tool descriptions as the primary mechanism LLMs use for tool selection; minimal descriptions lead to unreliable selection",
          "The importance of including input formats, example queries, edge cases, and boundary explanations",
          "How ambiguous or overlapping tool descriptions cause misrouting",
          "The impact of system prompt wording on tool selection: keyword-sensitive instructions can create unintended tool associations",
        ],
        skillsIn: [
          "Writing tool descriptions that clearly differentiate each tool's purpose, expected inputs, outputs, and when to use it",
          "Renaming tools and updating descriptions to eliminate functional overlap",
          "Splitting generic tools into purpose-specific tools with defined input/output contracts",
          "Reviewing system prompts for keyword-sensitive instructions that might override tool descriptions",
        ],
      },
      {
        id: "2.2",
        title: "Implement structured error responses for MCP tools",
        knowledgeOf: [
          "The MCP isError flag pattern for communicating tool failures back to the agent",
          "The distinction between transient, validation, business, and permission errors",
          "Why uniform error responses prevent the agent from making appropriate recovery decisions",
          "The difference between retryable and non-retryable errors",
        ],
        skillsIn: [
          "Returning structured error metadata: errorCategory (transient/validation/permission), isRetryable, human-readable descriptions",
          "Including retriable: false flags and customer-friendly explanations for business rule violations",
          "Implementing local error recovery within subagents, propagating only unresolvable errors with partial results",
          "Distinguishing access failures from valid empty results",
        ],
      },
      {
        id: "2.3",
        title: "Distribute tools appropriately across agents and configure tool choice",
        knowledgeOf: [
          "Too many tools (e.g., 18 instead of 4-5) degrades tool selection reliability",
          "Agents with tools outside their specialization tend to misuse them",
          "Scoped tool access: giving agents only the tools needed for their role",
          "tool_choice options: 'auto', 'any', and forced tool selection ({type: 'tool', name: '...'})",
        ],
        skillsIn: [
          "Restricting each subagent's tool set to those relevant to its role",
          "Replacing generic tools with constrained alternatives",
          "Providing scoped cross-role tools for high-frequency needs",
          "Using tool_choice forced selection to ensure a specific tool is called first",
          "Setting tool_choice: 'any' to guarantee the model calls a tool rather than returning text",
        ],
      },
      {
        id: "2.4",
        title: "Integrate MCP servers into Claude Code and agent workflows",
        knowledgeOf: [
          "MCP server scoping: project-level (.mcp.json) vs user-level (~/.claude.json)",
          "Environment variable expansion in .mcp.json (e.g., ${GITHUB_TOKEN})",
          "Tools from all configured MCP servers are discovered at connection time and available simultaneously",
          "MCP resources as a mechanism for exposing content catalogs to reduce exploratory tool calls",
        ],
        skillsIn: [
          "Configuring shared MCP servers in project-scoped .mcp.json with env var expansion",
          "Configuring personal MCP servers in user-scoped ~/.claude.json",
          "Enhancing MCP tool descriptions to prevent agent from preferring built-in tools over more capable MCP tools",
          "Choosing existing community MCP servers over custom implementations for standard integrations",
          "Exposing content catalogs as MCP resources",
        ],
      },
      {
        id: "2.5",
        title: "Select and apply built-in tools (Read, Write, Edit, Bash, Grep, Glob) effectively",
        knowledgeOf: [
          "Grep for content search (file contents for patterns like function names, error messages)",
          "Glob for file path pattern matching (finding files by name or extension)",
          "Read/Write for full file operations; Edit for targeted modifications using unique text matching",
          "When Edit fails due to non-unique text matches, using Read + Write as fallback",
        ],
        skillsIn: [
          "Selecting Grep for searching code content across a codebase",
          "Selecting Glob for finding files matching naming patterns (e.g., **/*.test.tsx)",
          "Using Read then Write when Edit cannot find unique anchor text",
          "Building codebase understanding incrementally: Grep to find entry points, Read to follow imports",
          "Tracing function usage across wrapper modules by identifying exports then searching for each name",
        ],
      },
    ],
  },
  {
    id: 3,
    name: "Claude Code Configuration & Workflows",
    weight: 20,
    questionCount: 12,
    taskStatements: [
      {
        id: "3.1",
        title: "Configure CLAUDE.md files with appropriate hierarchy, scoping, and modular organization",
        knowledgeOf: [
          "The CLAUDE.md hierarchy: user-level (~/.claude/CLAUDE.md), project-level (.claude/CLAUDE.md or root), directory-level",
          "User-level settings apply only to that user—not shared via version control",
          "The @import syntax for referencing external files to keep CLAUDE.md modular",
          ".claude/rules/ directory for organizing topic-specific rule files",
        ],
        skillsIn: [
          "Diagnosing configuration hierarchy issues (e.g., instructions in user-level instead of project-level)",
          "Using @import to selectively include relevant standards files",
          "Splitting large CLAUDE.md files into focused topic-specific files in .claude/rules/",
          "Using the /memory command to verify which memory files are loaded",
        ],
      },
      {
        id: "3.2",
        title: "Create and configure custom slash commands and skills",
        knowledgeOf: [
          "Project-scoped commands in .claude/commands/ (shared via version control) vs user-scoped in ~/.claude/commands/",
          "Skills in .claude/skills/ with SKILL.md files supporting frontmatter: context: fork, allowed-tools, argument-hint",
          "context: fork for running skills in isolated sub-agent context",
          "Personal skill customization: creating personal variants in ~/.claude/skills/",
        ],
        skillsIn: [
          "Creating project-scoped slash commands in .claude/commands/ for team-wide availability",
          "Using context: fork to isolate skills that produce verbose output from the main session",
          "Configuring allowed-tools in skill frontmatter to restrict tool access",
          "Using argument-hint to prompt developers for required parameters",
          "Choosing between skills (on-demand) and CLAUDE.md (always-loaded)",
        ],
      },
      {
        id: "3.3",
        title: "Apply path-specific rules for conditional convention loading",
        knowledgeOf: [
          ".claude/rules/ files with YAML frontmatter paths fields containing glob patterns",
          "Path-scoped rules load only when editing matching files, reducing irrelevant context",
          "Glob-pattern rules over directory-level CLAUDE.md for cross-directory conventions",
        ],
        skillsIn: [
          "Creating .claude/rules/ files with YAML frontmatter path scoping (e.g., paths: ['terraform/**/*'])",
          "Using glob patterns to apply conventions to files by type regardless of directory location",
          "Choosing path-specific rules over subdirectory CLAUDE.md when conventions span the codebase",
        ],
      },
      {
        id: "3.4",
        title: "Determine when to use plan mode vs direct execution",
        knowledgeOf: [
          "Plan mode: complex tasks involving large-scale changes, multiple valid approaches, architectural decisions, multi-file modifications",
          "Direct execution: simple, well-scoped changes (e.g., single validation check in one function)",
          "Plan mode enables safe exploration and design before committing to changes",
          "The Explore subagent for isolating verbose discovery output and returning summaries",
        ],
        skillsIn: [
          "Selecting plan mode for architectural tasks (microservice restructuring, library migrations 45+ files)",
          "Selecting direct execution for well-understood changes with clear scope",
          "Using Explore subagent for verbose discovery phases to prevent context window exhaustion",
          "Combining plan mode for investigation with direct execution for implementation",
        ],
      },
      {
        id: "3.5",
        title: "Apply iterative refinement techniques for progressive improvement",
        knowledgeOf: [
          "Concrete input/output examples as the most effective way to communicate expected transformations",
          "Test-driven iteration: writing test suites first, then iterating by sharing test failures",
          "The interview pattern: having Claude ask questions to surface considerations before implementing",
          "When to provide all issues in a single message vs fixing sequentially",
        ],
        skillsIn: [
          "Providing 2-3 concrete input/output examples to clarify transformation requirements",
          "Writing test suites before implementation, then iterating by sharing test failures",
          "Using the interview pattern to surface design considerations in unfamiliar domains",
          "Addressing multiple interacting issues in a single message when fixes interact, sequential for independent",
        ],
      },
      {
        id: "3.6",
        title: "Integrate Claude Code into CI/CD pipelines",
        knowledgeOf: [
          "The -p (or --print) flag for running Claude Code in non-interactive mode",
          "--output-format json and --json-schema CLI flags for structured output in CI",
          "CLAUDE.md as the mechanism for providing project context to CI-invoked Claude Code",
          "Session context isolation: same session less effective at reviewing its own changes",
        ],
        skillsIn: [
          "Running Claude Code in CI with -p flag to prevent interactive input hangs",
          "Using --output-format json with --json-schema for machine-parseable structured findings",
          "Including prior review findings to avoid duplicate comments on re-runs",
          "Documenting testing standards in CLAUDE.md to improve CI test generation quality",
        ],
      },
    ],
  },
  {
    id: 4,
    name: "Prompt Engineering & Structured Output",
    weight: 20,
    questionCount: 12,
    taskStatements: [
      {
        id: "4.1",
        title: "Design prompts with explicit criteria to improve precision and reduce false positives",
        knowledgeOf: [
          "Explicit criteria over vague instructions (e.g., 'flag when behavior contradicts code' vs 'check accuracy')",
          "General instructions like 'be conservative' fail to improve precision vs specific criteria",
          "High false positive rates undermine developer trust in accurate categories",
        ],
        skillsIn: [
          "Writing specific review criteria defining which issues to report vs skip",
          "Temporarily disabling high false-positive categories to restore trust",
          "Defining explicit severity criteria with concrete code examples for each level",
        ],
      },
      {
        id: "4.2",
        title: "Apply few-shot prompting to improve output consistency and quality",
        knowledgeOf: [
          "Few-shot examples as the most effective technique for consistently formatted, actionable output",
          "Few-shot examples demonstrate ambiguous-case handling",
          "Few-shot enables model to generalize judgment to novel patterns",
          "Few-shot reduces hallucination in extraction tasks",
        ],
        skillsIn: [
          "Creating 2-4 targeted few-shot examples for ambiguous scenarios showing reasoning",
          "Including examples demonstrating specific desired output format",
          "Providing examples distinguishing acceptable patterns from genuine issues to reduce false positives",
          "Using few-shot for varied document structures and extraction tasks",
        ],
      },
      {
        id: "4.3",
        title: "Enforce structured output using tool use and JSON schemas",
        knowledgeOf: [
          "tool_use with JSON schemas: most reliable approach for guaranteed schema-compliant output",
          "tool_choice: 'auto' (may return text), 'any' (must call tool), forced (specific named tool)",
          "Strict schemas eliminate syntax errors but NOT semantic errors",
          "Schema design: required vs optional fields, enum with 'other' + detail string patterns",
        ],
        skillsIn: [
          "Defining extraction tools with JSON schemas and extracting data from tool_use response",
          "Setting tool_choice: 'any' to guarantee structured output when document type unknown",
          "Forcing specific tool with tool_choice: {type: 'tool', name: 'extract_metadata'}",
          "Designing optional/nullable fields to prevent model from fabricating values",
          "Adding enum values like 'unclear' and 'other' + detail fields for extensible categorization",
          "Including format normalization rules alongside strict output schemas",
        ],
      },
      {
        id: "4.4",
        title: "Implement validation, retry, and feedback loops for extraction quality",
        knowledgeOf: [
          "Retry-with-error-feedback: appending specific validation errors to prompt on retry",
          "Retries ineffective when info absent from source (vs format or structural errors)",
          "Feedback loop design: detected_pattern field for systematic dismissal analysis",
          "Semantic validation errors vs schema syntax errors (eliminated by tool use)",
        ],
        skillsIn: [
          "Implementing follow-up requests with original document, failed extraction, and specific validation errors",
          "Identifying when retries will be ineffective vs when they will succeed",
          "Adding detected_pattern fields for false positive pattern analysis",
          "Designing self-correction: calculated_total vs stated_total, conflict_detected booleans",
        ],
      },
      {
        id: "4.5",
        title: "Design efficient batch processing strategies",
        knowledgeOf: [
          "Message Batches API: 50% cost savings, up to 24-hour processing window, no guaranteed latency SLA",
          "Appropriate for non-blocking, latency-tolerant workloads; inappropriate for blocking workflows",
          "Batch API does not support multi-turn tool calling within a single request",
          "custom_id fields for correlating batch request/response pairs",
        ],
        skillsIn: [
          "Matching API approach to latency requirements: synchronous for pre-merge, batch for overnight",
          "Calculating batch submission frequency based on SLA constraints",
          "Handling batch failures: resubmitting only failed documents by custom_id",
          "Using prompt refinement on a sample set before batch-processing large volumes",
        ],
      },
      {
        id: "4.6",
        title: "Design multi-instance and multi-pass review architectures",
        knowledgeOf: [
          "Self-review limitations: model retains reasoning context, less likely to question own decisions",
          "Independent review instances more effective than self-review or extended thinking",
          "Multi-pass review: per-file local analysis plus cross-file integration passes",
        ],
        skillsIn: [
          "Using a second independent Claude instance to review generated code",
          "Splitting large reviews into focused per-file passes plus integration passes",
          "Running verification passes where model self-reports confidence alongside each finding",
        ],
      },
    ],
  },
  {
    id: 5,
    name: "Context Management & Reliability",
    weight: 15,
    questionCount: 9,
    taskStatements: [
      {
        id: "5.1",
        title: "Manage conversation context to preserve critical information across long interactions",
        knowledgeOf: [
          "Progressive summarization risks: condensing numerical values, percentages, dates into vague summaries",
          "The 'lost in the middle' effect: models reliably process beginning and end but may omit middle sections",
          "Tool results accumulate in context and consume tokens disproportionately to relevance",
          "The importance of passing complete conversation history in subsequent API requests",
        ],
        skillsIn: [
          "Extracting transactional facts into a persistent 'case facts' block included in each prompt",
          "Trimming verbose tool outputs to only relevant fields before they accumulate",
          "Placing key findings summaries at the beginning of aggregated inputs with explicit section headers",
          "Requiring subagents to include metadata (dates, source locations) in structured outputs",
          "Modifying upstream agents to return structured data instead of verbose content",
        ],
      },
      {
        id: "5.2",
        title: "Design effective escalation and ambiguity resolution patterns",
        knowledgeOf: [
          "Appropriate escalation triggers: customer requests human, policy exceptions/gaps, inability to make progress",
          "Sentiment-based escalation and self-reported confidence scores are unreliable proxies",
          "Multiple customer matches require clarification rather than heuristic selection",
        ],
        skillsIn: [
          "Adding explicit escalation criteria with few-shot examples to system prompt",
          "Honoring explicit customer requests for human agents immediately",
          "Acknowledging frustration while offering resolution when within agent capability",
          "Escalating when policy is ambiguous or silent on the customer's request",
          "Asking for additional identifiers when tool results return multiple matches",
        ],
      },
      {
        id: "5.3",
        title: "Implement error propagation strategies across multi-agent systems",
        knowledgeOf: [
          "Structured error context (failure type, attempted query, partial results, alternatives) enables recovery",
          "The distinction between access failures and valid empty results",
          "Generic error statuses hide valuable context from the coordinator",
          "Silently suppressing errors or terminating entire workflows are both anti-patterns",
        ],
        skillsIn: [
          "Returning structured error context including failure type, what was attempted, partial results, and alternatives",
          "Distinguishing access failures from valid empty results in error reporting",
          "Having subagents implement local recovery, only propagating unresolvable errors",
          "Structuring synthesis output with coverage annotations (well-supported vs gaps)",
        ],
      },
      {
        id: "5.4",
        title: "Manage context effectively in large codebase exploration",
        knowledgeOf: [
          "Context degradation in extended sessions: inconsistent answers, referencing 'typical patterns' instead of specific classes",
          "Scratchpad files for persisting key findings across context boundaries",
          "Subagent delegation for isolating verbose exploration output",
          "Structured state persistence for crash recovery: agents export state, coordinator loads manifest",
        ],
        skillsIn: [
          "Spawning subagents to investigate specific questions while main agent coordinates",
          "Having agents maintain scratchpad files recording key findings for subsequent questions",
          "Summarizing key findings from one phase before spawning sub-agents for the next",
          "Designing crash recovery using structured agent state exports (manifests)",
          "Using /compact to reduce context usage during extended sessions",
        ],
      },
      {
        id: "5.5",
        title: "Design human review workflows and confidence calibration",
        knowledgeOf: [
          "Aggregate accuracy metrics may mask poor performance on specific document types or fields",
          "Stratified random sampling for measuring error rates in high-confidence extractions",
          "Field-level confidence scores calibrated using labeled validation sets",
          "Validating accuracy by document type and field before automating high-confidence extractions",
        ],
        skillsIn: [
          "Implementing stratified random sampling of high-confidence extractions for ongoing error detection",
          "Analyzing accuracy by document type and field to verify consistent performance",
          "Having models output field-level confidence scores, calibrating thresholds with labeled sets",
          "Routing low model confidence or ambiguous source documents to human review",
        ],
      },
      {
        id: "5.6",
        title: "Preserve information provenance and handle uncertainty in multi-source synthesis",
        knowledgeOf: [
          "Source attribution lost during summarization when findings are compressed without claim-source mappings",
          "Structured claim-source mappings that synthesis must preserve and merge",
          "Handling conflicting statistics: annotating conflicts with source attribution rather than selecting one",
          "Temporal data: requiring publication/collection dates to prevent temporal misinterpretation",
        ],
        skillsIn: [
          "Requiring subagents to output structured claim-source mappings (source URLs, document names, excerpts)",
          "Structuring reports distinguishing well-established findings from contested ones",
          "Completing analysis with conflicting values included and explicitly annotated",
          "Requiring publication or data collection dates in structured outputs",
          "Rendering different content types appropriately (financial as tables, news as prose, technical as lists)",
        ],
      },
    ],
  },
];

export function getDomainById(id: number): Domain | undefined {
  return DOMAINS.find((d) => d.id === id);
}

export function getTaskStatement(
  domainId: number,
  taskId: string
): TaskStatement | undefined {
  const domain = getDomainById(domainId);
  return domain?.taskStatements.find((ts) => ts.id === taskId);
}

export function getAllTaskStatements(): TaskStatement[] {
  return DOMAINS.flatMap((d) => d.taskStatements);
}
