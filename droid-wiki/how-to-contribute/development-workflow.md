# Development workflow

The day-to-day loop for making a change. See [Getting started](../overview/getting-started.md) for first-time setup.

## Run the stack

```bash
npm run dev          # runs dev:server (tsx watch :4000) + dev:web (vite :5173)
```

`tsx watch` reloads the API on save; Vite hot-reloads the web app. The Vite proxy forwards `/api` to the API (`web/vite.config.ts`), so you work against a single origin at `http://localhost:5173`.

## The change loop

1. **Locate the layer.** HTTP routes are in `server/src/index.ts`; analysis logic in `server/src/analysis/*`; AI in `server/src/ai/*`; UI in `web/src/pages` and `web/src/components`. See [Server](../apps/server.md) and [Web](../apps/web.md).
2. **Make the change**, matching surrounding style (see [Patterns and conventions](patterns-and-conventions.md)).
3. **Keep the contract in sync.** A server type change usually needs a mirror in `web/src/api.ts`; a new endpoint needs a matching `api` method.
4. **Verify** with the quality gates before considering it done.

## Quality gates

```bash
npm run typecheck    # tsc --noEmit (server + web)
npm run lint         # eslint (server + web)
npm run dupcheck     # jscpd (server + web)
```

All three should exit cleanly. These are the same checks used as the project's verification discipline (see [Lore](../lore.md), phase 8). There is no unit-test runner — see [Testing](testing.md) for how behavior is verified.

## Common tasks

| Task | Where |
| --- | --- |
| Add/modify an endpoint | `server/src/index.ts` + `web/src/api.ts` |
| Add a CSV column | `ALIASES` + `FrameRecord` in `server/src/parser.ts` / `types.ts` |
| Add a summary metric | `summarize()` + `RunSummary` (and `METRICS` in `compare.ts` if compared) |
| Add an anomaly detector | `server/src/analysis/anomalies.ts` |
| Add an AI provider | `server/src/ai/llm.ts` + `index.ts` + `config.ts` + Settings UI |
| Regenerate sample data | `npm run generate-samples` |
| Restyle | CSS variables in `web/src/styles.css` |

## Building

```bash
npm run build        # server: tsc → dist/ ; web: tsc && vite build → dist/
```

Run the built API with `node server/dist/index.js`. The web bundle is static and served separately. See [Getting started](../overview/getting-started.md).
