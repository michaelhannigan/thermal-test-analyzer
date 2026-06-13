import "dotenv/config";
import cors from "cors";
import express from "express";
import multer from "multer";
import { compareRuns } from "./analysis/compare.js";
import { activeProviderName, analyzeComparison, analyzePortfolio, analyzeRun, testConnection } from "./ai/index.js";
import { getPublicConfig, updateConfig, type ProviderChoice } from "./ai/config.js";
import { store } from "./store.js";
import type { RunSummary } from "./types.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", aiProvider: activeProviderName() });
});

// --- AI settings (runtime, in-memory) ---
const VALID_PROVIDERS: ProviderChoice[] = ["auto", "openai", "anthropic", "openrouter", "mock", "ollama"];

app.get("/api/settings", (_req, res) => {
  res.json(getPublicConfig());
});

app.put("/api/settings", (req, res) => {
  const {
    provider,
    openaiApiKey,
    anthropicApiKey,
    openrouterApiKey,
    openaiModel,
    anthropicModel,
    openrouterModel,
    ollamaBaseUrl,
    ollamaModel,
  } = req.body ?? {};
  if (provider !== undefined && !VALID_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: `provider must be one of ${VALID_PROVIDERS.join(", ")}` });
  }
  updateConfig({
    provider,
    openaiApiKey,
    anthropicApiKey,
    openrouterApiKey,
    openaiModel,
    anthropicModel,
    openrouterModel,
    ollamaBaseUrl,
    ollamaModel,
  });
  res.json(getPublicConfig());
});

app.post("/api/settings/test", async (_req, res) => {
  const result = await testConnection();
  res.status(result.ok ? 200 : 502).json(result);
});

// Create a run from an uploaded CSV file or a JSON body { name, csv }.
app.post("/api/runs", upload.single("file"), (req, res) => {
  try {
    let csv: string | undefined;
    let name: string | undefined = req.body?.name;

    if (req.file) {
      csv = req.file.buffer.toString("utf-8");
      name = name || req.file.originalname.replace(/\.csv$/i, "");
    } else if (typeof req.body?.csv === "string") {
      csv = req.body.csv;
    }

    if (!csv) {
      return res.status(400).json({ error: "Provide a CSV file (field 'file') or JSON { name, csv }." });
    }

    const { run, warnings } = store.create(name || `run-${Date.now()}`, csv);
    res.status(201).json({
      id: run.id,
      name: run.name,
      createdAt: run.createdAt,
      analysis: run.analysis,
      warnings,
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Create multiple runs from a batch of uploaded CSV files. Continues on per-file
// parse errors so one bad file doesn't fail the whole upload.
app.post("/api/runs/batch", upload.array("files", 50), (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    return res.status(400).json({ error: "Provide one or more CSV files (field 'files')." });
  }
  const created: Array<{ id: string; name: string; createdAt: number; summary: RunSummary; warnings: string[] }> = [];
  const errors: Array<{ name: string; error: string }> = [];
  for (const file of files) {
    const name = file.originalname.replace(/\.csv$/i, "") || `run-${Date.now()}`;
    try {
      const { run, warnings } = store.create(name, file.buffer.toString("utf-8"));
      created.push({ id: run.id, name: run.name, createdAt: run.createdAt, summary: run.analysis.summary, warnings });
    } catch (err) {
      errors.push({ name, error: (err as Error).message });
    }
  }
  res.status(created.length > 0 ? 201 : 400).json({ created, errors });
});

app.get("/api/runs", (_req, res) => {
  res.json(
    store.list().map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
      summary: r.analysis.summary,
      anomalyCount: r.analysis.anomalies.length,
      criticalCount: r.analysis.anomalies.filter((a) => a.severity === "critical").length,
      hasAiReport: Boolean(r.aiReport),
    })),
  );
});

app.get("/api/runs/:id", (req, res) => {
  const run = store.get(req.params.id);
  if (!run) return res.status(404).json({ error: "Run not found" });
  res.json({
    id: run.id,
    name: run.name,
    createdAt: run.createdAt,
    analysis: run.analysis,
    aiReport: run.aiReport,
  });
});

app.delete("/api/runs/:id", (req, res) => {
  const ok = store.delete(req.params.id);
  res.status(ok ? 204 : 404).end();
});

// Generate (and cache) the regression-intelligence report for a single run.
app.post("/api/runs/:id/intel", async (req, res) => {
  const run = store.get(req.params.id);
  if (!run) return res.status(404).json({ error: "Run not found" });
  const { report, provider } = await analyzeRun(run.name, run.analysis);
  store.setReport(run.id, report);
  res.json({ report, provider });
});

// --- Baseline management ---

app.get("/api/baseline", (_req, res) => {
  res.json(store.getBaseline());
});

// Manual override: advisory lock that establishes/replaces the baseline directly.
app.post("/api/baseline", (req, res) => {
  const { runId } = req.body ?? {};
  const state = store.setBaseline(runId);
  if (!state) return res.status(404).json({ error: "runId must reference an existing run." });
  res.json(state);
});

// Promote a candidate only if it beats the current baseline (no regressions and a
// positive aggregate improvement). Otherwise the locked baseline is preserved.
app.post("/api/baseline/promote", (req, res) => {
  const { candidateId } = req.body ?? {};
  const candidate = store.get(candidateId);
  if (!candidate) return res.status(404).json({ error: "candidateId must reference an existing run." });

  const baselineState = store.getBaseline();
  if (!baselineState) return res.status(400).json({ error: "No baseline is set yet." });
  if (baselineState.runId === candidate.id) {
    return res.status(400).json({ error: "Candidate is already the baseline." });
  }

  const baseline = store.get(baselineState.runId);
  if (!baseline) return res.status(400).json({ error: "No baseline is set yet." });

  const comparison = compareRuns(baseline, candidate);
  if (!comparison.promotable) {
    const reason =
      comparison.regressions.length > 0
        ? "Candidate regressed on one or more metrics."
        : "Candidate did not improve overall against the baseline.";
    return res.json({ promoted: false, reason, comparison, baseline: baselineState });
  }

  const newBaseline = store.setBaseline(candidate.id);
  res.json({ promoted: true, comparison, baseline: newBaseline });
});

function loadPair(req: express.Request, res: express.Response) {
  const { baselineId, candidateId } = req.body ?? {};
  const baseline = store.get(baselineId);
  const candidate = store.get(candidateId);
  if (!baseline || !candidate) {
    res.status(404).json({ error: "Both baselineId and candidateId must reference existing runs." });
    return null;
  }
  return { baseline, candidate };
}

app.post("/api/compare", (req, res) => {
  const pair = loadPair(req, res);
  if (!pair) return;
  res.json(compareRuns(pair.baseline, pair.candidate));
});

app.post("/api/compare/intel", async (req, res) => {
  const pair = loadPair(req, res);
  if (!pair) return;
  const comparison = compareRuns(pair.baseline, pair.candidate);
  const { report, provider } = await analyzeComparison(comparison);
  res.json({ report, provider, comparison });
});

// Compare every run against the current (or a specified) baseline at once,
// ranked by overall improvement. Powers the bulk "compare all runs" view.
app.post("/api/compare/all", (req, res) => {
  const { baselineId } = req.body ?? {};
  const baselineState = store.getBaseline();
  const resolvedBaselineId = baselineId ?? baselineState?.runId;
  if (!resolvedBaselineId) {
    return res.status(400).json({ error: "No baseline is set. Upload a run or set a baseline first." });
  }
  const baseline = store.get(resolvedBaselineId);
  if (!baseline) return res.status(404).json({ error: "Baseline run not found." });

  const candidates = store.list().filter((r) => r.id !== baseline.id);
  if (candidates.length === 0) {
    return res.status(400).json({ error: "Need at least one run besides the baseline to compare." });
  }
  const comparisons = candidates
    .map((c) => compareRuns(baseline, c))
    .sort((a, b) => b.overallImprovementPct - a.overallImprovementPct);
  res.json({ baseline: { id: baseline.id, name: baseline.name }, comparisons });
});

// Portfolio-level intelligence across all runs vs the baseline: ranked verdicts,
// dominant failure modes, and a recommended baseline. Deterministic and offline-safe.
app.post("/api/compare/all/intel", async (req, res) => {
  const { baselineId } = req.body ?? {};
  const baselineState = store.getBaseline();
  const resolvedBaselineId = baselineId ?? baselineState?.runId;
  if (!resolvedBaselineId) {
    return res.status(400).json({ error: "No baseline is set. Upload a run or set a baseline first." });
  }
  const baseline = store.get(resolvedBaselineId);
  if (!baseline) return res.status(404).json({ error: "Baseline run not found." });

  const candidates = store.list().filter((r) => r.id !== baseline.id);
  if (candidates.length === 0) {
    return res.status(400).json({ error: "Need at least one run besides the baseline to compare." });
  }
  const comparisons = candidates.map((c) => compareRuns(baseline, c));
  const { report, provider } = await analyzePortfolio(baseline.name, comparisons);
  res.json({ report, provider });
});

// Convert Multer (and other uncaught) errors into clean JSON responses instead of
// Express's default HTML "Internal Server Error" page.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File too large. The maximum upload size is 50 MB."
        : err.code === "LIMIT_UNEXPECTED_FILE"
          ? `Unexpected upload field "${err.field}". Send the CSV using the field name "file".`
          : `Upload error: ${err.message}`;
    return res.status(status).json({ error: message });
  }
  console.error("Unhandled server error:", err);
  res.status(500).json({ error: (err as Error)?.message ?? "Internal server error" });
});

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => {
  console.log(`Thermal Test Analyzer API listening on http://localhost:${PORT} (AI provider: ${activeProviderName()})`);
});
