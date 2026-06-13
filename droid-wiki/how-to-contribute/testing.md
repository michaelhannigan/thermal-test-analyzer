# Testing

There is **no automated unit-test runner** in this repo (no Vitest/Jest, no `test` script). Verification relies on three static quality gates plus manual/integration smoke testing. This page explains how to confirm a change is safe.

## The quality gates

```bash
npm run typecheck    # tsc --noEmit on both apps — strict mode catches most contract breaks
npm run lint         # eslint on both apps
npm run dupcheck     # jscpd duplicate-code check (fails above 5% duplication)
```

Because both apps are TypeScript-strict, `typecheck` is the primary safety net: it catches mismatches between the server types (`server/src/types.ts`) and the mirrored client types (`web/src/api.ts`), which is the most common source of bugs here. See [Tooling](tooling.md) for the configs.

## Integration / smoke testing

The historical verification approach (see [Lore](../lore.md), phase 8) was live HTTP testing against a transient server. To do this manually:

```bash
# start the API in the background
npm run dev:server &
# generate fixtures if needed
npm run generate-samples
# exercise the flow
curl -F "file=@server/sample-data/run-a-baseline.csv" http://localhost:4000/api/runs
curl http://localhost:4000/api/runs
curl -X POST http://localhost:4000/api/compare/all \
  -H 'Content-Type: application/json' -d '{}'
# stop it when done
pkill -f "tsx src/index.ts"
```

Always stop transient servers afterward (`pkill -f "tsx src/index.ts"`) so port 4000 is free for the next run.

Because all AI analysis has a deterministic offline path (the `mock` provider and the intelligence core), you can verify intelligence endpoints with no API key:

```bash
curl -X POST http://localhost:4000/api/runs/<id>/intel   # returns a deterministic report
```

## The stale smoke test

`server/scripts/smoke-test.ts` was an ad-hoc end-to-end check, but it calls `MockProvider.summarizeRun` / `summarizeComparison` — methods removed when the AI layer became the SRIA. It is not wired to any npm script and **will not run as-is**. Treat it as a starting point to modernize rather than a working test. See [Cleanup opportunities](../cleanup-opportunities.md).

## If you add tests

Vitest fits the stack cleanly (ESM, TypeScript). High-value, deterministic targets that need no mocking:

- `server/src/parser.ts` — alias handling, coercion, warnings.
- `server/src/analysis/stats.ts` — mean/stddev/percentile/round.
- `server/src/analysis/anomalies.ts` — each detector's threshold boundaries.
- `server/src/analysis/compare.ts` — regression/promotability logic.
- `server/src/ai/intelligence.ts` — verdict and hypothesis selection.

Add a `test` script per app and fold it into the gates in [Development workflow](development-workflow.md).
