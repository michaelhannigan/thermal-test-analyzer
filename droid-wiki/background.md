# Background and design decisions

The reasoning behind the choices that shape this codebase. These explain why the app looks the way it does and what tradeoffs were accepted.

## Deterministic core grounds the LLM

**Decision:** a deterministic engine produces the entire structured report; an optional LLM only refines its narrative.

**Why:** in a regression-gating tool, a verdict must be reproducible and defensible. If a language model invented the numbers or the GO/NO-GO call, results would be non-deterministic and unauditable. Instead, `server/src/ai/intelligence.ts` computes verdict, behavioral changes, hypotheses, and validation steps from the data, and the LLM is handed that draft with strict instructions not to alter the facts (`server/src/ai/prompts.ts`). The model improves wording; it does not decide outcomes.

**Tradeoff:** the deterministic engine carries real domain logic (the `METRIC_NARRATIVE` and `VALIDATION` catalogs, the hypothesis heuristics), so adding a metric or failure mode means extending that engine, not just prompting a model. The payoff is offline operation and trustworthy verdicts. See [Regression intelligence agent](features/regression-intelligence-agent.md).

## Offline-first / air-gapped

**Decision:** the whole app must work with no internet.

**Why:** the target domain (defense thermal-imaging telemetry) is sensitive and often air-gapped. The analysis core makes zero network calls, the `mock` provider returns the full deterministic report, and the `ollama` provider gives local LLM refinement with no API key. Cloud providers are an enhancement, never a requirement.

**Tradeoff:** every AI capability ships with a fallback path, which adds branching in `server/src/ai/index.ts` and `llm.ts`. The benefit is that availability never depends on a cloud key. See [Getting started](overview/getting-started.md) for the air-gapped runbook and [Security](security.md) for data-sensitivity notes.

## Pluggable provider abstraction

**Decision:** all AI backends sit behind a single `AiProvider` interface, resolved per request.

**Why:** it lets five backends (OpenAI, Anthropic, OpenRouter, Ollama, mock) be swapped at runtime via Settings without code changes or restarts, and it isolates the rest of the app from provider-specific quirks (OpenRouter reuses the OpenAI shape; Ollama uses a native endpoint). Resolving per call means a key/provider change takes effect immediately.

**Tradeoff:** a thin extra layer (`provider.ts`, `llm.ts`, `index.ts`) versus calling an SDK directly. Worth it for the runtime flexibility. See [AI providers](features/ai-providers.md).

## In-memory state, no database

**Decision:** runs and baseline live in a `Map`; nothing is persisted.

**Why:** the tool is for a single analysis session — upload a batch, compare, decide, done. A database would add operational weight (migrations, connections, deployment) for little benefit at this scope.

**Tradeoff:** all data is lost on restart, and there's no multi-user or historical store. The simplicity keeps the server tiny and the deployment trivial. See [Server](apps/server.md).

## Tolerant parsing over strict schemas

**Decision:** the CSV parser accepts header aliases and missing columns, warning instead of failing.

**Why:** real test logs vary in column naming and completeness. Rejecting a file outright would frustrate users; surfacing warnings while still producing a best-effort analysis is more useful. See [CSV ingestion and analysis](features/csv-ingestion-and-analysis.md).

**Tradeoff:** a malformed file can silently default fields to 0, so the `warnings` array matters. The app returns it on every upload for exactly this reason.

## No CSS framework

**Decision:** inline styles driven by CSS custom properties (`web/src/styles.css`).

**Why:** a small, single-theme dashboard didn't justify a styling dependency. CSS variables give a consistent dark "sensor-ops" palette that components reference directly.

**Tradeoff:** styles are co-located with markup rather than in a design system. For an app this size it keeps things self-contained. See [Web](apps/web.md).

## Verification by gates, not unit tests

**Decision:** rely on strict typecheck + lint + duplicate-check (and manual smoke tests) rather than a unit-test suite.

**Why:** strict TypeScript across mirrored client/server types catches the majority of contract bugs, and the deterministic engine makes manual end-to-end checks cheap. This was a deliberate scope choice, with a unit-test runner listed as a recommended next step.

**Tradeoff:** behavioral regressions in the analysis math aren't caught automatically. See [Testing](how-to-contribute/testing.md) and [Cleanup opportunities](cleanup-opportunities.md).
