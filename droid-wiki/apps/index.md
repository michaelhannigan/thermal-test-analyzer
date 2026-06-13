# Apps

The repository is a monorepo with two deployable applications. Each has its own `package.json`, `tsconfig.json`, lint config, and `node_modules`. The root `package.json` orchestrates them with `--prefix` scripts.

| App | Path | Stack | Role |
| --- | --- | --- | --- |
| Server | `server/` | Express 4, TypeScript, Multer, csv-parse | REST API: parsing, analysis, comparison, baseline state, AI layer |
| Web | `web/` | React 18, Vite 5, Recharts | Single-page dashboard for upload, run detail, comparison, settings, summary |

```mermaid
graph LR
    Web[web · :5173 dev] -->|/api proxy → :4000| Server[server · :4000]
```

In development the Vite server proxies `/api` to the API (`web/vite.config.ts`), so they behave as one origin. In production the server serves only the API and the web bundle is hosted separately.

## Pages

- [Server](server.md) — module map, routes, store, error handling, and how the analysis and AI layers are wired into HTTP.
- [Web](web.md) — page/component structure, the typed API client, the tab router, and the design system.

Most domain depth lives under [Features](../features/index.md); these app pages focus on structure and wiring and link out to the feature pages for algorithms.
