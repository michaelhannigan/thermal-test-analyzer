# Patterns and conventions

Conventions that recur across the codebase. Following them keeps changes consistent and keeps the lint/typecheck gates green.

## Language and modules

- **TypeScript strict mode** everywhere. Both `server/tsconfig.json` and `web/tsconfig.json` set `"strict": true`. Avoid `any`; model data with the shared types in `server/src/types.ts` (mirrored in `web/src/api.ts`).
- **ESM only.** Both packages are `"type": "module"`. Server imports use explicit `.js` extensions on relative paths (e.g. `import { store } from "./store.js"`) because the compiled output is ESM. Web imports use `.ts`/`.tsx` extensions (e.g. `import { api } from "./api.ts"`).
- **`consistent-type-imports`** is enforced (warn): import types with `import type { Foo } from "..."`.

## Server patterns

- **Layering.** HTTP code lives only in `server/src/index.ts`. Analysis functions are pure and live in `server/src/analysis/*`. The store (`server/src/store.ts`) is the only stateful domain module. Do not call analysis or AI code from inside the parser, and do not put HTTP concerns in analysis.
- **Errors as JSON.** Routes wrap parsing in try/catch and return `{ error: string }` with an appropriate status. A trailing Express error middleware converts Multer and uncaught errors into clean JSON (413/400/500) instead of HTML (`server/src/index.ts`).
- **Tolerant parsing.** The CSV parser accepts header aliases and missing columns, emitting warnings rather than throwing (`server/src/parser.ts`). Numeric helpers default to 0; booleans accept `1/true/yes/y`.
- **Deterministic numbers.** All computed metrics go through `round()` (`server/src/analysis/stats.ts`) so output is stable and comparable.
- **In-memory state.** Runs and baseline live in a `Map` in `server/src/store.ts`. There is no persistence; design new features to tolerate a cold start (everything resets on restart).

## AI layer patterns

- **Deterministic core grounds the LLM.** Always build the full report deterministically first (`server/src/ai/intelligence.ts`), then optionally let a provider refine it. Never let an LLM be the source of numeric truth.
- **Provider interface.** New providers implement `AiProvider` (`server/src/ai/provider.ts`): `analyzeRun`, `analyzeComparison`, `analyzePortfolio`, `test`. LLM providers wrap a `ChatProvider` via `LlmProvider` (`server/src/ai/llm.ts`).
- **Fallback everywhere.** Every public AI entry point in `server/src/ai/index.ts` catches provider failures and falls back to the mock, tagging the result `"mock (fallback)"`. Parsing of LLM output falls back to the deterministic draft on bad JSON.
- **Resolve providers per call.** `resolveProvider()` reads config on every request so runtime Settings changes take effect without a restart.

## Web patterns

- **Typed API client.** All network calls go through the `api` object in `web/src/api.ts`. Types there mirror the server's `types.ts`. Add a method there rather than calling `fetch` from components.
- **Inline styles + CSS variables.** There is no CSS framework. Components use inline `style` objects referencing CSS custom properties defined in `web/src/styles.css` (e.g. `var(--surface)`, `var(--accent)`, `var(--critical)`). Reuse these tokens for theme consistency.
- **Pages vs components.** Top-level views live in `web/src/pages/*`; reusable presentational pieces in `web/src/components/*`. The tab router is plain state in `web/src/App.tsx` (no router library).
- **Pure helpers separate from components.** To satisfy `react-refresh/only-export-components`, shared non-component helpers live in their own module (e.g. `web/src/components/intelTheme.ts`), not alongside component exports.

## Naming and lint rules

- `eqeqeq` (smart), `no-var`, `prefer-const` are errors in both configs.
- Unused variables are errors unless prefixed with `_` (`argsIgnorePattern: "^_"`).
- Filenames: components and pages are PascalCase (`RunsPage.tsx`); other modules are lowerCamel or kebab (`intelTheme.ts`, `generate-samples.mjs`).

See [Tooling](tooling.md) for the exact ESLint/jscpd configuration and [Server](../apps/server.md) / [Web](../apps/web.md) for module-by-module detail.
