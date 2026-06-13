# Cleanup opportunities

Observations a maintainer might want to address. These are not bugs in shipped behavior — the app works — but they are loose ends, missing safety nets, and known gaps. Ordered roughly by impact.

## Stale smoke test (`server/scripts/smoke-test.ts`)

The script calls `MockProvider.summarizeRun` and `summarizeComparison`, methods that were removed when the AI layer became the SRIA (the provider now exposes `analyzeRun` / `analyzeComparison` / `analyzePortfolio`). It is not referenced by any npm script and will not run as-is.

**Fix:** update it to the current provider API (or delete it) and wire it into a `test`/`smoke` script. It's a good seed for a real integration test. See [Testing](how-to-contribute/testing.md).

## No automated test suite

There is no unit-test runner or `test` script. Correctness rests on strict typecheck, lint, dupcheck, and manual smoke tests.

**Fix:** add Vitest with deterministic tests for `parser.ts`, `analysis/stats.ts`, `anomalies.ts`, `compare.ts`, and `ai/intelligence.ts` (all pure, no mocking needed), plus coverage thresholds. Listed as a top next step in `AGENT_READINESS_SUMMARY.txt`.

## Manually mirrored types

`web/src/api.ts` re-declares the server types from `server/src/types.ts` by hand. They can drift, and a mismatch only surfaces as a typecheck error after the fact.

**Fix:** share the types via a small internal package or a generated `.d.ts`, or import the server types directly into the web build.

## Missing developer hygiene tooling

No formatter (Prettier), no pre-commit hooks (Husky + lint-staged), no CI workflow, and no dependency-update automation (Dependabot/Renovate).

**Fix:** add Prettier for consistent formatting, Husky + lint-staged to run the gates pre-commit, and a CI workflow running typecheck/lint/dupcheck (and tests, once they exist) on PRs. See [Tooling](how-to-contribute/tooling.md).

## Open CORS and no auth/rate limiting

`app.use(cors())` allows any origin, and there is no authentication or rate limiting. Fine for localhost, risky if exposed — especially since Settings can set API keys and trigger outbound LLM calls.

**Fix:** restrict CORS, add an auth token, and rate-limit the intelligence endpoints before any shared deployment. See [Security](security.md).

## Documentation drift on providers

`AGENT_READINESS_SUMMARY.txt` and some docs predate the OpenRouter and Ollama providers and the SRIA transformation, so they reference `AI_PROVIDER` values and an "AI summary" model that have since evolved into five providers and a structured intelligence report.

**Fix:** refresh `.env.example` and the README to list all five providers (`auto`, `openai`, `anthropic`, `openrouter`, `ollama`, `mock`) and the Ollama/OpenRouter variables, and to describe the intelligence reports rather than plain summaries.

## Module-level counter in anomaly detection

`anomalies.ts` uses a module-level `counter` for anomaly ids that increments across every call for the process lifetime. Ids remain unique but are not stable per run and grow unbounded.

**Fix:** scope the counter per `detectAnomalies` call if stable/relative ids are ever needed (e.g., for snapshot tests).

## Uncommitted working tree

The git history is a single `Initial commit`; the substantial current code exists as uncommitted changes (see [By the numbers](by-the-numbers.md)).

**Fix:** commit the current state in logical chunks so history reflects the SDLC phases the app documents in [Lore](lore.md).
