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
      "Droid designed a provider abstraction so OpenAI/Anthropic or an offline deterministic mock are interchangeable, with automatic fallback on failure.",
    tools: ["Create"],
    artifacts: ["ai/provider.ts", "ai/llm.ts", "ai/mock.ts", "ai/prompts.ts", "ai/index.ts"],
    outcome: "AI summaries that work with or without an API key.",
  },
  {
    id: "6",
    phase: "Test Data",
    title: "Synthetic Fixtures",
    factoryRole:
      "Droid generated reproducible sample logs — a healthy baseline and a deliberately regressed run (sensor soak, SNR dropout, latency spikes) — to exercise every code path.",
    tools: ["Create", "Execute"],
    artifacts: ["generate-samples.mjs", "run-a-baseline.csv", "run-b-candidate.csv"],
    outcome: "Realistic data proving anomalies and regressions surface correctly.",
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
      "Droid self-verified: TypeScript typechecks on both packages, a production web build, and live HTTP integration tests covering upload → analyze → compare → summarize.",
    tools: ["Execute"],
    artifacts: ["tsc --noEmit (server + web)", "vite build", "curl end-to-end flow"],
    outcome: "Green typechecks, successful build, verified API behavior.",
  },
  {
    id: "9",
    phase: "Iteration",
    title: "Feature Extension",
    factoryRole:
      "On follow-up requests, Droid extended the running system — runtime API-key management and this very SDLC summary — re-running the quality gates after each change.",
    tools: ["Read", "Edit", "Create", "Execute"],
    artifacts: ["Settings tab (runtime keys)", "Summary tab (this view)"],
    outcome: "The app evolves safely without regressions.",
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

// Representative tool invocation profile for this build session.
export const TOOL_USAGE: ToolUsage[] = [
  { tool: "Create", uses: 28, purpose: "Author new source files" },
  { tool: "Execute", uses: 12, purpose: "Install, build, test, run" },
  { tool: "Edit", uses: 8, purpose: "Surgical code changes" },
  { tool: "Read", uses: 5, purpose: "Inspect existing code" },
  { tool: "TodoWrite", uses: 5, purpose: "Maintain the plan" },
  { tool: "AskUser", uses: 1, purpose: "Capture requirements" },
];

export const BUILD_STATS = [
  { label: "SDLC Phases", value: "9" },
  { label: "Source Files", value: "30+" },
  { label: "Packages", value: "2" },
  { label: "Quality Gates", value: "4" },
  { label: "AI Providers", value: "3" },
  { label: "Human Inputs", value: "1 Q&A" },
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
  "OpenAI / Anthropic",
];
