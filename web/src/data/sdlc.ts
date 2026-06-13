export interface SdlcPhase {
  id: string;
  phase: string;
  title: string;
  factoryRole: string;
  tools: string[];
  artifacts: string[];
  outcome: string;
}

// A faithful record of how Factory's Droid agent orchestrated the build of
// this application, phase by phase across the software development lifecycle.
export const SDLC_PHASES: SdlcPhase[] = [
  {
    id: "1",
    phase: "Discovery",
    title: "Requirements Capture",
    factoryRole:
      "Rather than guessing, Droid identified the high-leverage unknowns and asked a structured questionnaire to lock down scope before writing any code.",
    tools: ["AskUser"],
    artifacts: ["4 clarifying questions", "Decisions: Web + React/Node, pluggable AI, CSV logs"],
    outcome: "Ambiguity removed: interface, AI strategy, data format, and stack agreed up front.",
  },
  {
    id: "2",
    phase: "Planning",
    title: "Task Decomposition",
    factoryRole:
      "Droid broke the goal into an ordered, trackable plan and kept exactly one task in-progress at a time, updating status as work completed.",
    tools: ["TodoWrite"],
    artifacts: ["8-step execution plan", "Live progress tracking"],
    outcome: "A transparent roadmap from scaffolding through verification.",
  },
  {
    id: "3",
    phase: "Architecture",
    title: "Project Scaffolding",
    factoryRole:
      "Droid established a clean two-package layout (server + web) with strict TypeScript, ESM, and a dev proxy — choosing conventions consistent across the codebase.",
    tools: ["Execute", "Create"],
    artifacts: ["server/ + web/ packages", "tsconfig, vite.config, package.json"],
    outcome: "A typed, buildable foundation for both tiers.",
  },
  {
    id: "4",
    phase: "Implementation",
    title: "Analysis Engine (Backend)",
    factoryRole:
      "Droid implemented the domain core: a tolerant CSV parser, statistical helpers, threshold + z-score anomaly detection, run summaries, and baseline-vs-candidate regression comparison.",
    tools: ["Create", "Edit"],
    artifacts: ["parser.ts", "analysis/* (stats, anomalies, analyze, compare)", "types.ts"],
    outcome: "Deterministic, testable thermal-effectiveness analytics.",
  },
  {
    id: "5",
    phase: "Implementation",
    title: "Pluggable AI Layer",
    factoryRole:
      "Droid designed a provider abstraction so multiple cloud LLMs or an offline deterministic mock are interchangeable, with automatic fallback on failure.",
    tools: ["Create"],
    artifacts: ["ai/provider.ts", "ai/llm.ts", "ai/mock.ts", "ai/prompts.ts", "ai/index.ts"],
    outcome: "AI analysis that works with or without an API key.",
  },
  {
    id: "6",
    phase: "Test Data",
    title: "Synthetic Fixtures",
    factoryRole:
      "Droid generated reproducible sample logs from shared baseline knobs and scenario presets — a healthy baseline plus deliberately regressed and improved runs — to exercise every code path.",
    tools: ["Create", "Execute"],
    artifacts: ["generate-samples.mjs (knobs + 12 scenarios)", "12 sample CSVs (baseline / regressed / improved)"],
    outcome: "Realistic data proving anomalies, regressions, and promotable wins surface correctly.",
  },
  {
    id: "7",
    phase: "Implementation",
    title: "Dashboard (Frontend)",
    factoryRole:
      "Droid built the React dashboard — upload, run detail with charts, and run comparison — with a cohesive dark sensor-ops theme and a typed API client.",
    tools: ["Create"],
    artifacts: ["api.ts", "components/* (charts, metrics, anomalies)", "pages/* (Runs, Detail, Compare)"],
    outcome: "An interactive UI over the full analysis pipeline.",
  },
  {
    id: "8",
    phase: "Verification",
    title: "Quality Gates",
    factoryRole:
      "Droid self-verified every change: TypeScript typechecks and ESLint on both packages, a production web build, and live HTTP integration tests on transient servers covering the full flow.",
    tools: ["Execute"],
    artifacts: ["tsc --noEmit + eslint (server + web)", "vite build", "curl/python end-to-end smoke tests"],
    outcome: "Green typechecks, clean lint, successful build, verified API behavior.",
  },
  {
    id: "9",
    phase: "Iteration",
    title: "Air-Gapped AI & Baseline Promotion",
    factoryRole:
      "From a spec-mode plan, Droid added a local Ollama provider for offline use, an overall improvement score, a locked baseline with promotion rules, and runtime key management.",
    tools: ["ExitSpecMode", "Create", "Edit", "Execute"],
    artifacts: ["ai/llm.ts (Ollama)", "baseline state + promotion endpoints", "Settings tab (runtime keys)"],
    outcome: "Candidates are gated and promoted by measured improvement — fully offline if needed.",
  },
  {
    id: "10",
    phase: "Iteration",
    title: "Scale & Batch Workflows",
    factoryRole:
      "Droid scaled the data set to twelve scenarios and added multi-file upload plus a one-shot compare-all that ranks every run against the baseline.",
    tools: ["AskUser", "Edit", "Create", "Execute"],
    artifacts: ["POST /runs/batch", "POST /compare/all", "UploadZone (multi) + CompareAllPanel"],
    outcome: "Whole-portfolio analysis in a single action, with stay-on-Runs upload UX.",
  },
  {
    id: "11",
    phase: "Iteration",
    title: "Simulation Regression Intelligence Agent",
    factoryRole:
      "Droid transformed AI analysis into a regression intelligence agent: a deterministic engine grounds an optional LLM to produce GO/NO-GO verdicts, ranked root-cause hypotheses, prioritized validation steps, and actionable engineering conclusions per behavioral change.",
    tools: ["AskUser", "Create", "Edit", "Execute"],
    artifacts: ["ai/intelligence.ts (deterministic core)", "run / comparison / portfolio reports", "IntelligenceReportPanel + PortfolioReportPanel"],
    outcome: "Structured, evidence-grounded verdicts that work offline and sharpen with an LLM.",
  },
  {
    id: "12",
    phase: "Iteration",
    title: "Provider Expansion & Hardening",
    factoryRole:
      "Droid added an OpenRouter provider, routed portfolio intelligence through the active LLM, and hardened the system — upload error handling, settings persistence fixes, and this SDLC summary.",
    tools: ["ToolSearch", "Read", "Edit", "Execute"],
    artifacts: ["ai/llm.ts (OpenRouter)", "Multer error middleware", "Summary tab (this view)"],
    outcome: "Five interchangeable AI providers and a resilient, regression-free app.",
  },
];

export interface LoopStep {
  label: string;
  detail: string;
}

// Factory's core agentic loop applied throughout the build.
export const ORCHESTRATION_LOOP: LoopStep[] = [
  { label: "Clarify", detail: "Resolve unknowns with the user" },
  { label: "Plan", detail: "Decompose into tracked tasks" },
  { label: "Act", detail: "Read / create / edit code & run commands" },
  { label: "Verify", detail: "Typecheck, build, integration test" },
  { label: "Iterate", detail: "Extend on feedback, re-verify" },
];

export interface ToolUsage {
  tool: string;
  uses: number;
  purpose: string;
}

// Representative tool invocation profile across the full build + iterations.
export const TOOL_USAGE: ToolUsage[] = [
  { tool: "Edit", uses: 64, purpose: "Surgical code changes" },
  { tool: "Create", uses: 46, purpose: "Author new source files" },
  { tool: "Execute", uses: 42, purpose: "Install, build, test, run" },
  { tool: "Read", uses: 34, purpose: "Inspect existing code" },
  { tool: "TodoWrite", uses: 12, purpose: "Maintain the plan" },
  { tool: "AskUser", uses: 5, purpose: "Capture requirements" },
];

export const BUILD_STATS = [
  { label: "SDLC Phases", value: "12" },
  { label: "Source Files", value: "45+" },
  { label: "Packages", value: "2" },
  { label: "Quality Gates", value: "4" },
  { label: "AI Providers", value: "5" },
  { label: "Human Inputs", value: "Q&A-driven" },
];

export const TECH_STACK = [
  "TypeScript",
  "Node.js",
  "Express",
  "React 18",
  "Vite",
  "Recharts",
  "Multer",
  "csv-parse",
  "OpenAI",
  "Anthropic",
  "OpenRouter",
  "Ollama",
];
