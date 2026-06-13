# By the numbers

Quantitative snapshot of the repository as of this wiki's generation. Counts are source-only (excludes `node_modules`, `dist`, lockfiles).

## Size

| Metric | Value |
| --- | --- |
| Applications | 2 (`server`, `web`) |
| Server source (TS + scripts) | ~2,570 lines |
| Web source (TS + TSX) | ~3,030 lines |
| Total source | ~5,600 lines |
| Server source files | 16 |
| Web source files | 19 |
| Sample CSV fixtures | 12 |

## Largest source files

| Lines | File |
| --- | --- |
| 767 | `web/src/pages/ComparePage.tsx` |
| 601 | `server/src/ai/intelligence.ts` |
| 402 | `web/src/pages/SettingsPage.tsx` |
| 313 | `web/src/api.ts` |
| 284 | `server/src/index.ts` |
| 253 | `web/src/pages/SummaryPage.tsx` |
| 241 | `server/src/ai/prompts.ts` |
| 196 | `server/scripts/generate-samples.mjs` |
| 195 | `server/src/ai/llm.ts` |
| 193 | `server/src/types.ts` |

`ComparePage.tsx` is the heaviest module — it hosts pairwise comparison, compare-all, promotion controls, and the portfolio report in one screen. The deterministic intelligence core is the largest backend file.

## Surface area

| Metric | Value |
| --- | --- |
| REST endpoints | 16 (see [API reference](api/index.md)) |
| AI providers | 5 (`openai`, `anthropic`, `openrouter`, `ollama`, `mock`) |
| Anomaly detectors | 7 (`server/src/analysis/anomalies.ts`) |
| Compared metrics | 12 (`METRICS` in `server/src/analysis/compare.ts`) |
| Summary metrics | 15 (`RunSummary`) |
| Frame fields | 17 (`FrameRecord`) |
| Sample scenarios | 12 (baseline, regressed, 3 improved, 7 failure modes) |
| Quality gates | 3 commands (`typecheck`, `lint`, `dupcheck`) |

## Composition

- **Language:** ~100% TypeScript (one `.mjs` generator script, one `.css` stylesheet, one `.html` entry).
- **Module system:** ESM in both packages.
- **Tests:** no unit-test runner; verification is via the three quality gates plus a (currently stale) `server/scripts/smoke-test.ts`. See [Testing](how-to-contribute/testing.md) and [Cleanup opportunities](cleanup-opportunities.md).

## Version control

| Metric | Value |
| --- | --- |
| Commits | 1 (`Initial commit`, 2026-05-31) |
| Contributors | 1 (Michael Hannigan) |
| Default branch | `main` |

The git history is a single squashed commit; the bulk of the current code lives as uncommitted working-tree changes. For the development narrative the project records its own lifecycle in `web/src/data/sdlc.ts` — see [Lore](lore.md).
