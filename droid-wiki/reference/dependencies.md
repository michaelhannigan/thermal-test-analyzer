# Dependencies

Each app manages its own dependencies with a committed `package-lock.json`. The root package has no dependencies — it only orchestrates the two apps.

## Server (`server/package.json`)

### Runtime

| Package | Purpose |
| --- | --- |
| `express` ^4.19 | HTTP server and routing |
| `cors` ^2.8 | CORS middleware (currently open) |
| `multer` ^1.4 (lts) | Multipart CSV uploads (memory storage, 50 MB limit) |
| `csv-parse` ^5.5 | CSV parsing (`parse/sync`) |
| `dotenv` ^16.4 | Loads `.env` into `process.env` |

No AI SDKs: cloud providers are called with `fetch` directly (`server/src/ai/llm.ts`).

### Dev

| Package | Purpose |
| --- | --- |
| `typescript` ^5.5 | Compiler / typecheck |
| `tsx` ^4.16 | Run TS directly in dev (`tsx watch`) |
| `eslint` ^9.9, `@eslint/js`, `typescript-eslint` ^8.2, `globals` | Linting (flat config) |
| `jscpd` ^4.0 | Duplicate-code detection |
| `@types/node`, `@types/express`, `@types/cors`, `@types/multer` | Type definitions |

## Web (`web/package.json`)

### Runtime

| Package | Purpose |
| --- | --- |
| `react` ^18.3, `react-dom` ^18.3 | UI framework |
| `recharts` ^2.12 | Time-series and metric charts |

### Dev

| Package | Purpose |
| --- | --- |
| `vite` ^5.3, `@vitejs/plugin-react` ^4.3 | Dev server and bundler |
| `typescript` ^5.5 | Compiler / typecheck |
| `eslint` ^9.9, `@eslint/js`, `typescript-eslint` ^8.2, `globals` | Linting |
| `eslint-plugin-react-hooks` ^5.1 | React hooks lint rules (v5 for ESLint 9) |
| `eslint-plugin-react-refresh` ^0.4 | Fast-refresh lint rule |
| `jscpd` ^4.0 | Duplicate-code detection |
| `@types/react`, `@types/react-dom` | Type definitions |

## Notes

- **No state-management, router, or CSS-framework libraries** on the web side — navigation is component state and styling is inline + CSS variables (see [Web](../apps/web.md)).
- **No ORM/database driver** on the server — state is in memory (see [Background](../background.md)).
- **Dependencies are pinned** via lockfiles (a passing readiness signal), but there is **no automated update tooling** (Dependabot/Renovate) — see [Cleanup opportunities](../cleanup-opportunities.md).
