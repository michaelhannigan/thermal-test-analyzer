# API reference

The server exposes a JSON REST API under `/api`, defined in `server/src/index.ts`. All responses are JSON. Errors return `{ "error": string }` with an appropriate status, normalized by a trailing error middleware (Multer errors become 413/400; uncaught errors become 500). The base URL in development is `http://localhost:4000` (the web app proxies `/api` to it).

## Conventions

- **Content types:** uploads are `multipart/form-data`; everything else is `application/json`.
- **IDs:** run ids are server-generated strings.
- **Rates:** `RunSummary` rate fields are 0..1; comparison output scales them to percentages.
- **State:** in-memory; all data resets on server restart.

## Health

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | `{ status: "ok", aiProvider }` — the active provider name |

## Settings

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/settings` | Masked public AI config (`getPublicConfig`) — no raw keys |
| PUT | `/api/settings` | Update provider/keys/models at runtime; validates `provider` against the allowed list |
| POST | `/api/settings/test` | Test the resolved provider's credentials; 200 on success, 502 on failure |

`PUT /api/settings` accepts any subset of: `provider`, `openaiApiKey`, `anthropicApiKey`, `openrouterApiKey`, `openaiModel`, `anthropicModel`, `openrouterModel`, `ollamaBaseUrl`, `ollamaModel`. A `null` key clears it; an omitted field is left unchanged. `provider` must be one of `auto`, `openai`, `anthropic`, `openrouter`, `mock`, `ollama`. See [Configuration](../reference/configuration.md) and [AI providers](../features/ai-providers.md).

## Runs

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/runs` | Create one run from an uploaded CSV (`file`) or JSON `{ name, csv }`. 201 with analysis + warnings; 400 if no CSV |
| POST | `/api/runs/batch` | Create many runs from `files[]` (≤50). Returns `{ created[], errors[] }`; continues past per-file parse errors |
| GET | `/api/runs` | List runs with summary, anomaly counts, and `hasAiReport` |
| GET | `/api/runs/:id` | Full run: `analysis` + cached `aiReport`. 404 if missing |
| DELETE | `/api/runs/:id` | Delete a run. 204 on success, 404 if missing |
| POST | `/api/runs/:id/intel` | Generate and cache the run's intelligence report; returns `{ report, provider }` |

Uploads use Multer memory storage with a 50 MB per-file limit. Oversized files return 413; an unexpected field name returns 400.

## Baseline

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/baseline` | Current `BaselineState` (or null) |
| POST | `/api/baseline` | Manually set the baseline to `{ runId }` (advisory override). 404 if run missing |
| POST | `/api/baseline/promote` | Promote `{ candidateId }` only if it beats the baseline; otherwise returns `{ promoted: false, reason, comparison }` |

The first uploaded run is auto-seeded as the baseline. Promotion is gated on zero regressions and a positive overall improvement. See [Run comparison and baseline promotion](../features/run-comparison-and-baseline-promotion.md).

## Compare

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/compare` | Pairwise `{ baselineId, candidateId }` → `ComparisonResult` |
| POST | `/api/compare/intel` | As above plus an intelligence `report` and `provider` |
| POST | `/api/compare/all` | Compare every run against the (optional `{ baselineId }` or current) baseline, ranked by overall improvement |
| POST | `/api/compare/all/intel` | Portfolio intelligence across all runs vs the baseline → `{ report, provider }` |

`compare/all` and `compare/all/intel` require at least one run besides the baseline (400 otherwise) and a set baseline (400 otherwise).

## Response shapes

The structured response types — `RunAnalysis`, `RunSummary`, `Anomaly`, `ComparisonResult`, `MetricDelta`, `IntelligenceReport`, `PortfolioReport`, `BaselineState` — are documented in [Data models](../reference/data-models.md) and mirrored client-side in `web/src/api.ts`.
