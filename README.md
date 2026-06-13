# Thermal Test Analyzer

AI-assisted analyzer for thermal imaging effectiveness test logs: anomaly summaries,
regression detection, and run-vs-run comparison with baseline promotion.

The repo is a small monorepo with two applications:

- **`server/`** — Express + TypeScript REST API. Parses thermal test CSV logs, runs
  anomaly/regression analysis, compares runs, and generates AI summaries.
- **`web/`** — React + Vite single-page app for uploading runs and visualizing
  anomalies, comparisons, and AI summaries.

## Setup

```bash
npm run install:all   # install server + web dependencies
npm run dev           # start API (:4000) and web dev server (:5173) together
```

Other useful commands:

```bash
npm run build         # build server + web for production
npm run typecheck     # typecheck both apps
npm run lint          # lint both apps
npm run dupcheck      # duplicate-code check for both apps
npm run generate-samples  # write sample CSV runs into server/sample-data
```

The web dev server proxies `/api` to `http://localhost:4000`.

## Environment variables

Copy `.env.example` to `.env` (repo root or `server/`) and adjust. The server loads
`.env` automatically via `dotenv`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | API server port |
| `AI_PROVIDER` | `auto` | `auto` \| `openai` \| `anthropic` \| `ollama` \| `mock` |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | – / `gpt-4o-mini` | OpenAI cloud provider |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | – / `claude-3-5-haiku-latest` | Anthropic cloud provider |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | `http://localhost:11434` / `llama3.1` | Local Ollama provider |

Provider settings can also be changed at runtime from the **Settings** tab (held in
server memory only; environment variables are used for persistence).

## AI providers

Summaries are produced by a pluggable provider. If a live provider fails, the app
automatically falls back to the deterministic **mock** provider so the dashboard
never blocks on AI availability.

- `openai` / `anthropic` — cloud providers (require an API key, internet access).
- `ollama` — a local [Ollama](https://ollama.com) server; no API key, no internet.
- `mock` — offline deterministic summarizer built from the computed analysis.

## Air-gapped operation

The core analysis (CSV parsing, anomaly detection, run comparison, baseline
promotion) is fully local and never makes external calls. To run the full app —
including AI summaries — with **no internet access**:

1. **Install dependencies while still online**, then move the machine off-network:
   ```bash
   npm run install:all
   ```
   `node_modules` for both apps must be present before going air-gapped.
2. **Fonts** load from Google Fonts; with no network the UI falls back to the system
   monospace/sans-serif fonts defined in `web/src/styles.css` (functionality is
   unaffected).
3. **Run a local Ollama server** on the box (or another host on the local network)
   and pull a model ahead of time:
   ```bash
   ollama pull llama3.1
   ```
4. **Point the app at Ollama** via environment (or the Settings tab):
   ```bash
   AI_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama3.1
   ```
5. Build/run normally (`npm run build` / `npm run dev`). If Ollama is unreachable,
   summaries fall back to the offline mock provider automatically.

## Baseline promotion

The app tracks a single **locked baseline** run used as the reference for
comparisons:

- The **first uploaded run** is auto-seeded as the baseline.
- On the **Compare** tab, comparing a candidate against the baseline shows an overall
  verdict and aggregate improvement percentage (mean of direction-aware per-metric
  deltas).
- A candidate can be **promoted to the new baseline** only when it has **zero
  regressions** AND a **positive aggregate improvement** — i.e. it genuinely beats the
  current baseline. The baseline stays locked until a better run beats it.
- A **manual override** ("Force set as baseline" / "set baseline") is available if you
  need to set the baseline directly; the lock is advisory.

Baseline state and runs are kept in memory and reset when the server restarts.
