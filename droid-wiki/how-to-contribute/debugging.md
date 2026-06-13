# Debugging

Common failure modes and how to diagnose them. Most issues fall into parsing, state, or AI-provider categories.

## Uploads

| Symptom | Likely cause | Where to look |
| --- | --- | --- |
| `400 Provide a CSV file…` | No `file`/`files` field or empty body | `POST /api/runs` handler in `server/src/index.ts` |
| `413 File too large` | File exceeds the 50 MB Multer limit | Multer config + error middleware in `server/src/index.ts` |
| `400 Unexpected upload field` | Wrong multipart field name | Use `file` (single) or `files` (batch) |
| Run created but metrics look wrong | Header names not recognized → defaulted to 0 | `ALIASES` in `server/src/parser.ts`; check returned `warnings` |

The parser is tolerant by design: missing columns warn rather than throw. Always inspect the `warnings` array in the upload response when numbers look off. See [CSV ingestion and analysis](../features/csv-ingestion-and-analysis.md).

## State and baseline

- **"No baseline is set"** on compare-all/promote — no run has been uploaded yet (the first upload auto-seeds the baseline) or the baseline run was deleted. Check `GET /api/baseline`.
- **Everything disappeared after a restart** — expected. State is in-memory (`server/src/store.ts`); there is no persistence.
- **Promotion refused** — the candidate isn't promotable (a regression exists or no overall improvement). The promote response includes `reason` and the full `comparison`. See [Run comparison and baseline promotion](../features/run-comparison-and-baseline-promotion.md).

## AI providers

- **Report says `mock (fallback)`** — the configured live provider threw; the system fell back to the deterministic engine. The server logs the cause (`AI provider "…" failed, using mock fallback: …`). Check `server/src/ai/index.ts` console output.
- **Report `generatedBy` is the provider but content looks deterministic** — the model returned unparseable JSON, so `LlmProvider.refine` kept the draft. Look for `returned unparseable output` in the logs (`server/src/ai/llm.ts`).
- **Settings won't switch providers** — the `provider` value must be one of the allowed `VALID_PROVIDERS`; an invalid value returns 400. Keys are masked in `GET /api/settings`, so verify with `POST /api/settings/test`.
- **Ollama errors** — confirm the server is running and `OLLAMA_BASE_URL`/`OLLAMA_MODEL` are correct; the model must be pulled ahead of time. See [AI providers](../features/ai-providers.md).

## Build / typecheck

- **Type error across apps** — the server and web types are mirrored manually (`server/src/types.ts` ↔ `web/src/api.ts`). A change on one side that isn't reflected on the other is the most common typecheck failure.
- **ESM import errors** — server relative imports must end in `.js`; web imports in `.ts`/`.tsx`. See [Patterns and conventions](patterns-and-conventions.md).
- **react-refresh lint warning** — a component file is exporting a non-component. Move helpers to a separate module (as `intelTheme.ts` does).

## Useful probes

```bash
curl http://localhost:4000/api/health          # is the API up? which provider is active?
curl http://localhost:4000/api/settings        # masked AI config + key sources
curl -X POST http://localhost:4000/api/settings/test   # validate provider credentials
```

The server logs to stdout (`console.log`/`console.warn`/`console.error`); there is no structured logging or external error tracking, so the dev console is the primary signal. Observability is intentionally minimal for a single-session tool.
