# Tooling

The toolchain that builds, runs, and checks the code. Both apps use the same stack with app-specific configs.

## Package scripts

The root `package.json` orchestrates the two apps with `--prefix`:

| Root script | Runs |
| --- | --- |
| `install:all` | `npm --prefix server install && npm --prefix web install` |
| `dev` | `dev:server` (`tsx watch`) + `dev:web` (`vite`) |
| `build` | server `tsc` then web `tsc && vite build` |
| `typecheck` / `lint` / `dupcheck` | the matching per-app script in both apps |
| `generate-samples` | `node server/scripts/generate-samples.mjs` |

Per-app scripts (`server/package.json`, `web/package.json`): `dev`, `build`, `start`/`preview`, `typecheck`, `lint`, `dupcheck`.

## TypeScript

Both apps are strict ESM. Server `tsconfig.json`: `target`/`module` ES2022, `moduleResolution: bundler`, `outDir: dist`, `rootDir: src`, `strict: true`. The web tsconfig adds `noUnusedLocals`/`noUnusedParameters`. `typecheck` runs `tsc --noEmit` and is the main correctness gate (see [Testing](testing.md)).

## Dev runner and bundler

- **tsx** runs the server directly from TypeScript in dev (`tsx watch src/index.ts`) — no build step needed locally.
- **Vite** serves and builds the web app. `web/vite.config.ts` registers `@vitejs/plugin-react` and proxies `/api` → `http://localhost:4000`.

## ESLint (flat config, v9)

Both apps use ESLint 9 flat configs built on `@eslint/js` recommended + `typescript-eslint` recommended, with shared rules:

- `@typescript-eslint/no-unused-vars` (error; `^_` ignored)
- `eqeqeq` smart (error), `no-var` (error), `prefer-const` (error)

The server config (`server/eslint.config.js`) uses Node globals and lints `src` + `scripts`. The web config (`web/eslint.config.js`) uses browser globals and adds `eslint-plugin-react-hooks` (recommended rules) and `eslint-plugin-react-refresh` (`only-export-components` as a warning). The react-hooks plugin is pinned to v5 for ESLint 9 compatibility.

> Note: `consistent-type-imports` is referenced in the project's readiness notes; the active enforcement is the rule set above. Prefer `import type` regardless, as the codebase does.

## Duplicate detection (jscpd)

`server/.jscpd.json` and `web/.jscpd.json` configure jscpd with a 5% duplication threshold (`minLines` 5, `minTokens` 50), console + JSON reporters, ignoring `node_modules`/`dist`. The web config also covers `tsx`/`jsx`. `dupcheck` fails if duplication exceeds the threshold; generated `.jscpd-report/` output is gitignored.

## What's not here

No formatter (Prettier), no pre-commit hooks (Husky/lint-staged), no CI workflow, no unit-test runner, and no dependency-update automation. These are documented as the highest-impact next steps in `AGENT_READINESS_SUMMARY.txt` and echoed in [Cleanup opportunities](../cleanup-opportunities.md).
