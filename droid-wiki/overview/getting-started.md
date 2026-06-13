# Getting started

This page covers prerequisites, installation, running the app in development, building for production, and the quality gates. All commands are run from the repository root unless noted.

## Prerequisites

- **Node.js** 20+ (the server targets ES2022 / Node 20 types).
- **npm** (the repo uses npm workspaces-style prefixing, not a workspace manager).
- Optional: an [Ollama](https://ollama.com) server and/or an OpenAI / Anthropic / OpenRouter API key for live LLM analysis. None of these are required — the app ships with a deterministic offline engine.

## Install

```bash
npm run install:all   # installs server/ then web/ dependencies
```

This runs `npm --prefix server install && npm --prefix web install` (`package.json`). Both apps keep their own `node_modules` and `package-lock.json`.

## Run in development

```bash
npm run dev           # starts API (:4000) and web dev server (:5173) together
```

`npm run dev` launches `dev:server` (`tsx watch src/index.ts`) and `dev:web` (`vite`) in parallel. Open `http://localhost:5173`. The Vite dev server proxies `/api` to the API on port 4000 (`web/vite.config.ts`).

To run them separately:

```bash
npm run dev:server    # API only, on :4000
npm run dev:web       # web only, on :5173
```

## Generate sample data

The repo includes a generator for synthetic thermal logs:

```bash
npm run generate-samples   # writes 12 CSVs into server/sample-data/
```

This runs `server/scripts/generate-samples.mjs`, which produces a healthy baseline, a regressed candidate, three improved/promotable runs, and seven distinct failure-mode runs. Upload these via the **Runs** tab to explore the app. See [CSV ingestion and analysis](../features/csv-ingestion-and-analysis.md) for the scenario catalog.

## Build for production

```bash
npm run build         # tsc (server) + tsc && vite build (web)
```

- Server compiles to `server/dist/` and runs with `node dist/index.js` (the `start` script in `server/package.json`).
- Web emits a static bundle in `web/dist/` (serve with any static host or `npm --prefix web run preview`).

A production server serves only the API; the built web bundle must be hosted separately or behind a reverse proxy that forwards `/api`.

## Quality gates

There is no unit-test runner, but the repo enforces three checks (also used as the agent's verification loop):

```bash
npm run typecheck     # tsc --noEmit on both apps
npm run lint          # eslint on both apps
npm run dupcheck      # jscpd duplicate-code check on both apps
```

See [Testing](../how-to-contribute/testing.md) for how changes are verified and [Tooling](../how-to-contribute/tooling.md) for the lint/duplicate configs.

## Configuration

Copy `.env.example` to `.env` (repo root or `server/`) and adjust. The server loads it via `dotenv`. The most relevant variable is `AI_PROVIDER`; everything works with the default `auto` (which falls back to the offline `mock`). See [Configuration](../reference/configuration.md) for the full variable list and the runtime **Settings** tab.

## Air-gapped operation

The analysis core never makes network calls. To run the full app — including AI analysis — with no internet:

1. Install dependencies while online (`npm run install:all`), then go off-network.
2. Run a local Ollama server and pull a model ahead of time (`ollama pull llama3.1`).
3. Set `AI_PROVIDER=ollama` (and `OLLAMA_BASE_URL` / `OLLAMA_MODEL`) via env or the Settings tab.
4. Build and run normally. If Ollama is unreachable, analysis falls back to the offline mock engine automatically.

See [Background](../background.md) for the design rationale behind offline-first operation.
