import cors from "cors";
import express from "express";
import multer from "multer";
import { compareRuns } from "./analysis/compare.js";
import { activeProviderName, summarizeComparison, summarizeRun, testConnection } from "./ai/index.js";
import { getPublicConfig, updateConfig, type ProviderChoice } from "./ai/config.js";
import { store } from "./store.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", aiProvider: activeProviderName() });
});

// --- AI settings (runtime, in-memory) ---
const VALID_PROVIDERS: ProviderChoice[] = ["auto", "openai", "anthropic", "mock"];

app.get("/api/settings", (_req, res) => {
  res.json(getPublicConfig());
});

app.put("/api/settings", (req, res) => {
  const { provider, openaiApiKey, anthropicApiKey, openaiModel, anthropicModel } = req.body ?? {};
  if (provider !== undefined && !VALID_PROVIDERS.includes(provider)) {
    return res.status(400).json({ error: `provider must be one of ${VALID_PROVIDERS.join(", ")}` });
  }
  updateConfig({ provider, openaiApiKey, anthropicApiKey, openaiModel, anthropicModel });
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

app.get("/api/runs", (_req, res) => {
  res.json(
    store.list().map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
      summary: r.analysis.summary,
      anomalyCount: r.analysis.anomalies.length,
      criticalCount: r.analysis.anomalies.filter((a) => a.severity === "critical").length,
      hasAiSummary: Boolean(r.aiSummary),
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
    aiSummary: run.aiSummary,
  });
});

app.delete("/api/runs/:id", (req, res) => {
  const ok = store.delete(req.params.id);
  res.status(ok ? 204 : 404).end();
});

// Generate (and cache) an AI anomaly summary for a single run.
app.post("/api/runs/:id/summarize", async (req, res) => {
  const run = store.get(req.params.id);
  if (!run) return res.status(404).json({ error: "Run not found" });
  const { text, provider } = await summarizeRun(run.name, run.analysis);
  store.setSummary(run.id, text);
  res.json({ summary: text, provider });
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

app.post("/api/compare/summarize", async (req, res) => {
  const pair = loadPair(req, res);
  if (!pair) return;
  const comparison = compareRuns(pair.baseline, pair.candidate);
  const { text, provider } = await summarizeComparison(comparison);
  res.json({ summary: text, provider, comparison });
});

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => {
  console.log(`Thermal Test Analyzer API listening on http://localhost:${PORT} (AI provider: ${activeProviderName()})`);
});
