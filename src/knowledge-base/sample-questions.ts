import { ExamQuestion } from "../models/exam-question";

export const SAMPLE_QUESTIONS: ExamQuestion[] = [
  {
    question_text:
      "Production data shows that in 12% of cases, your agent skips get_customer entirely and calls lookup_order using only the customer's stated name, occasionally leading to misidentified accounts and incorrect refunds. What change would most effectively address this reliability issue?",
    options: [
      "Add a programmatic prerequisite that blocks lookup_order and process_refund calls until get_customer has returned a verified customer ID.",
      "Enhance the system prompt to state that customer verification via get_customer is mandatory before any order operations.",
      "Add few-shot examples showing the agent always calling get_customer first, even when customers volunteer order details.",
      "Implement a routing classifier that analyzes each request and enables only the subset of tools appropriate for that request type.",
    ],
    correct_index: 0,
    explanation:
      "When a specific tool sequence is required for critical business logic (like verifying customer identity before processing refunds), programmatic enforcement provides deterministic guarantees that prompt-based approaches cannot. Options B and C rely on probabilistic LLM compliance, which is insufficient when errors have financial consequences. Option D addresses tool availability rather than tool ordering.",
    key_concept: "Programmatic enforcement vs prompt-based guidance",
    domain_id: 1,
    scenario_id: 1,
    task_statement_id: "1.4",
    difficulty: "medium",
    anti_patterns_in_distractors: [],
  },
  {
    question_text:
      'Production logs show the agent frequently calls get_customer when users ask about orders (e.g., "check my order #12345"), instead of calling lookup_order. Both tools have minimal descriptions ("Retrieves customer information" / "Retrieves order details") and accept similar identifier formats. What\'s the most effective first step to improve tool selection reliability?',
    options: [
      "Add few-shot examples to the system prompt demonstrating correct tool selection patterns, with 5-8 examples showing order-related queries routing to lookup_order.",
      "Expand each tool's description to include input formats it handles, example queries, edge cases, and boundaries explaining when to use it versus similar tools.",
      "Implement a routing layer that parses user input before each turn and pre-selects the appropriate tool based on detected keywords and identifier patterns.",
      "Consolidate both tools into a single lookup_entity tool that accepts any identifier and internally determines which backend to query.",
    ],
    correct_index: 1,
    explanation:
      "Tool descriptions are the primary mechanism LLMs use for tool selection. When descriptions are minimal, models lack the context to differentiate between similar tools. Option B directly addresses this root cause with a low-effort, high-leverage fix. Few-shot examples (A) add token overhead without fixing the underlying issue. A routing layer (C) is over-engineered. Consolidating tools (D) requires more effort than a 'first step' warrants.",
    key_concept: "Tool descriptions as primary selection mechanism",
    domain_id: 2,
    scenario_id: 1,
    task_statement_id: "2.1",
    difficulty: "medium",
    anti_patterns_in_distractors: ["AP2"],
  },
  {
    question_text:
      "Your agent achieves 55% first-contact resolution, well below the 80% target. Logs show it escalates straightforward cases (standard damage replacements with photo evidence) while attempting to autonomously handle complex situations requiring policy exceptions. What's the most effective way to improve escalation calibration?",
    options: [
      "Add explicit escalation criteria to your system prompt with few-shot examples demonstrating when to escalate versus resolve autonomously.",
      "Have the agent self-report a confidence score (1-10) before each response and automatically route requests to humans when confidence falls below a threshold.",
      "Deploy a separate classifier model trained on historical tickets to predict which requests need escalation before the main agent begins processing.",
      "Implement sentiment analysis to detect customer frustration levels and automatically escalate when negative sentiment exceeds a threshold.",
    ],
    correct_index: 0,
    explanation:
      "Adding explicit escalation criteria with few-shot examples directly addresses the root cause: unclear decision boundaries. Option B fails because LLM self-reported confidence is poorly calibrated. Option C is over-engineered, requiring labeled data and ML infrastructure when prompt optimization hasn't been tried. Option D solves a different problem; sentiment doesn't correlate with case complexity.",
    key_concept: "Escalation calibration with explicit criteria",
    domain_id: 5,
    scenario_id: 1,
    task_statement_id: "5.2",
    difficulty: "medium",
    anti_patterns_in_distractors: [],
  },
  {
    question_text:
      "You want to create a custom /review slash command that runs your team's standard code review checklist. This command should be available to every developer when they clone or pull the repository. Where should you create this command file?",
    options: [
      "In the .claude/commands/ directory in the project repository",
      "In ~/.claude/commands/ in each developer's home directory",
      "In the CLAUDE.md file at the project root",
      "In a .claude/config.json file with a commands array",
    ],
    correct_index: 0,
    explanation:
      "Project-scoped custom slash commands should be stored in the .claude/commands/ directory within the repository. These commands are version-controlled and automatically available to all developers. Option B is for personal commands not shared via version control. Option C is for project instructions, not command definitions. Option D describes a configuration mechanism that doesn't exist.",
    key_concept: "Project-scoped vs user-scoped commands",
    domain_id: 3,
    scenario_id: 2,
    task_statement_id: "3.2",
    difficulty: "easy",
    anti_patterns_in_distractors: [],
  },
  {
    question_text:
      "You've been assigned to restructure the team's monolithic application into microservices. This will involve changes across dozens of files and requires decisions about service boundaries and module dependencies. Which approach should you take?",
    options: [
      "Enter plan mode to explore the codebase, understand dependencies, and design an implementation approach before making changes.",
      "Start with direct execution and make changes incrementally, letting the implementation reveal the natural service boundaries.",
      "Use direct execution with comprehensive upfront instructions detailing exactly how each service should be structured.",
      "Begin in direct execution mode and only switch to plan mode if you encounter unexpected complexity during implementation.",
    ],
    correct_index: 0,
    explanation:
      "Plan mode is designed for complex tasks involving large-scale changes, multiple valid approaches, and architectural decisions. It enables safe codebase exploration and design before committing to changes. Option B risks costly rework. Option C assumes you already know the right structure without exploring. Option D ignores that complexity is already stated in requirements.",
    key_concept: "Plan mode for architectural decisions",
    domain_id: 3,
    scenario_id: 2,
    task_statement_id: "3.4",
    difficulty: "easy",
    anti_patterns_in_distractors: ["AP3"],
  },
  {
    question_text:
      "Your codebase has distinct areas with different coding conventions: React components use functional style with hooks, API handlers use async/await with specific error handling, and database models follow a repository pattern. Test files are spread throughout the codebase alongside the code they test. What's the most maintainable way to ensure Claude automatically applies the correct conventions when generating code?",
    options: [
      "Create rule files in .claude/rules/ with YAML frontmatter specifying glob patterns to conditionally apply conventions based on file paths",
      "Consolidate all conventions in the root CLAUDE.md file under headers for each area, relying on Claude to infer which section applies",
      "Create skills in .claude/skills/ for each code type that include the relevant conventions in their SKILL.md files",
      "Place a separate CLAUDE.md file in each subdirectory containing that area's specific conventions",
    ],
    correct_index: 0,
    explanation:
      "Option A is correct because .claude/rules/ with glob patterns (e.g., **/*.test.tsx) allows conventions to be automatically applied based on file paths regardless of directory location. Option B relies on inference rather than explicit matching. Option C requires manual skill invocation. Option D can't handle files spread across many directories since CLAUDE.md files are directory-bound.",
    key_concept: "Path-specific rules with glob patterns",
    domain_id: 3,
    scenario_id: 2,
    task_statement_id: "3.3",
    difficulty: "medium",
    anti_patterns_in_distractors: [],
  },
  {
    question_text:
      'After running the system on the topic "impact of AI on creative industries," you observe that each subagent completes successfully but the final reports cover only visual arts, completely missing music, writing, and film production. The coordinator decomposed the topic into: "AI in digital art creation," "AI in graphic design," and "AI in photography." What is the most likely root cause?',
    options: [
      "The synthesis agent lacks instructions for identifying coverage gaps in the findings it receives.",
      "The coordinator agent's task decomposition is too narrow, resulting in subagent assignments that don't cover all relevant domains of the topic.",
      "The web search agent's queries are not comprehensive enough and need to be expanded to cover more creative industry sectors.",
      "The document analysis agent is filtering out sources related to non-visual creative industries due to overly restrictive relevance criteria.",
    ],
    correct_index: 1,
    explanation:
      "The coordinator's logs reveal the root cause: it decomposed 'creative industries' into only visual arts subtasks. The subagents executed correctly within their assigned scope—the problem is what they were assigned. Options A, C, and D incorrectly blame downstream agents working correctly within their scope.",
    key_concept: "Overly narrow task decomposition",
    domain_id: 1,
    scenario_id: 3,
    task_statement_id: "1.6",
    difficulty: "medium",
    anti_patterns_in_distractors: [],
  },
  {
    question_text:
      "The web search subagent times out while researching a complex topic. You need to design how this failure information flows back to the coordinator agent. Which error propagation approach best enables intelligent recovery?",
    options: [
      "Return structured error context to the coordinator including the failure type, the attempted query, any partial results, and potential alternative approaches.",
      'Implement automatic retry logic with exponential backoff within the subagent, returning a generic "search unavailable" status only after all retries are exhausted.',
      "Catch the timeout within the subagent and return an empty result set marked as successful.",
      "Propagate the timeout exception directly to a top-level handler that terminates the entire research workflow.",
    ],
    correct_index: 0,
    explanation:
      "Structured error context gives the coordinator the information needed for intelligent recovery. Option B's generic status hides valuable context. Option C suppresses the error by marking failure as success. Option D terminates the entire workflow unnecessarily when recovery strategies could succeed.",
    key_concept: "Structured error propagation",
    domain_id: 5,
    scenario_id: 3,
    task_statement_id: "5.3",
    difficulty: "medium",
    anti_patterns_in_distractors: [],
  },
  {
    question_text:
      "The synthesis agent frequently needs to verify specific claims while combining findings. Currently it returns control to the coordinator for each verification, adding 2-3 round trips per task and increasing latency by 40%. 85% of verifications are simple fact-checks while 15% require deeper investigation. What's the most effective approach?",
    options: [
      "Give the synthesis agent a scoped verify_fact tool for simple lookups, while complex verifications continue delegating through the coordinator.",
      "Have the synthesis agent accumulate all verification needs and return them as a batch to the coordinator at the end of its pass.",
      "Give the synthesis agent access to all web search tools so it can handle any verification need directly.",
      "Have the web search agent proactively cache extra context around each source during initial research.",
    ],
    correct_index: 0,
    explanation:
      "Option A applies the principle of least privilege by giving the synthesis agent only what it needs for the 85% common case while preserving coordination for complex cases. Option B creates blocking dependencies. Option C over-provisions the agent, violating separation of concerns. Option D relies on speculative caching.",
    key_concept: "Scoped cross-role tools",
    domain_id: 2,
    scenario_id: 3,
    task_statement_id: "2.3",
    difficulty: "hard",
    anti_patterns_in_distractors: [],
  },
  {
    question_text:
      'Your pipeline script runs `claude "Analyze this pull request for security issues"` but the job hangs indefinitely. Logs indicate Claude Code is waiting for interactive input. What\'s the correct approach to run Claude Code in an automated pipeline?',
    options: [
      'Add the -p flag: `claude -p "Analyze this pull request for security issues"`',
      "Set the environment variable CLAUDE_HEADLESS=true before running the command",
      'Redirect stdin from /dev/null: `claude "Analyze this pull request..." < /dev/null`',
      'Add the --batch flag: `claude --batch "Analyze this pull request..."`',
    ],
    correct_index: 0,
    explanation:
      "The -p (or --print) flag is the documented way to run Claude Code in non-interactive mode. It processes the prompt, outputs the result to stdout, and exits. The other options reference non-existent features (CLAUDE_HEADLESS, --batch) or Unix workarounds that don't properly address Claude Code's command syntax.",
    key_concept: "Claude Code -p flag for CI/CD",
    domain_id: 3,
    scenario_id: 5,
    task_statement_id: "3.6",
    difficulty: "easy",
    anti_patterns_in_distractors: [],
  },
  {
    question_text:
      "Your team wants to reduce API costs. Currently, real-time Claude calls power two workflows: (1) a blocking pre-merge check that must complete before developers can merge, and (2) a technical debt report generated overnight. Your manager proposes switching both to the Message Batches API for its 50% cost savings. How should you evaluate this proposal?",
    options: [
      "Use batch processing for the technical debt reports only; keep real-time calls for pre-merge checks.",
      "Switch both workflows to batch processing with status polling to check for completion.",
      "Keep real-time calls for both workflows to avoid batch result ordering issues.",
      "Switch both to batch processing with a timeout fallback to real-time if batches take too long.",
    ],
    correct_index: 0,
    explanation:
      "The Message Batches API offers 50% cost savings but has processing times up to 24 hours with no guaranteed latency SLA. This makes it unsuitable for blocking pre-merge checks but ideal for overnight batch jobs. Option B is wrong because 'often faster' completion isn't acceptable for blocking workflows. Option C reflects a misconception—results can be correlated using custom_id. Option D adds unnecessary complexity.",
    key_concept: "Message Batches API appropriateness",
    domain_id: 4,
    scenario_id: 5,
    task_statement_id: "4.5",
    difficulty: "medium",
    anti_patterns_in_distractors: [],
  },
  {
    question_text:
      "A pull request modifies 14 files across the stock tracking module. Your single-pass review produces inconsistent results: detailed feedback for some files but superficial comments for others, obvious bugs missed, and contradictory feedback. How should you restructure the review?",
    options: [
      "Split into focused passes: analyze each file individually for local issues, then run a separate integration-focused pass examining cross-file data flow.",
      "Require developers to split large PRs into smaller submissions of 3-4 files before the automated review runs.",
      "Switch to a higher-tier model with a larger context window to give all 14 files adequate attention in one pass.",
      "Run three independent review passes on the full PR and only flag issues that appear in at least two of the three runs.",
    ],
    correct_index: 0,
    explanation:
      "Splitting reviews into focused passes addresses the root cause: attention dilution. File-by-file analysis ensures consistent depth, while a separate integration pass catches cross-file issues. Option B shifts burden to developers. Option C misunderstands that larger context windows don't solve attention quality. Option D would suppress detection of real bugs.",
    key_concept: "Multi-pass review architecture",
    domain_id: 4,
    scenario_id: 5,
    task_statement_id: "4.6",
    difficulty: "medium",
    anti_patterns_in_distractors: [],
  },
];
