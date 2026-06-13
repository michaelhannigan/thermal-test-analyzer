const BASE = "/api";

export interface RunSummaryItem {
  id: string;
  name: string;
  createdAt: number;
  summary: RunSummaryMetrics;
  anomalyCount: number;
  criticalCount: number;
  hasAiReport: boolean;
}

export interface RunSummaryMetrics {
  totalFrames: number;
  durationS: number;
  detectionRate: number;
  classificationRate: number;
  droppedFrameRate: number;
  meanSnrDb: number;
  meanDeltaTC: number;
  meanNetdMk: number;
  meanConfidence: number;
  meanLatencyMs: number;
  p95LatencyMs: number;
  meanTrackErrorM: number;
  maxSensorTempC: number;
  meanFrameRateHz: number;
  uniqueTargets: number;
}

export type AnomalySeverity = "critical" | "warning" | "info";

export interface Anomaly {
  id: string;
  category: string;
  severity: AnomalySeverity;
  title: string;
  description: string;
  metric: string;
  frameIds: number[];
  affectedCount: number;
  observedValue: number;
  threshold: number;
}

export interface TimeSeriesPoint {
  t: number;
  snrDb: number;
  deltaTC: number;
  detectionConfidence: number;
  sensorTempC: number;
  classificationLatencyMs: number;
}

export interface RunDetail {
  id: string;
  name: string;
  createdAt: number;
  analysis: {
    summary: RunSummaryMetrics;
    anomalies: Anomaly[];
    timeSeries: TimeSeriesPoint[];
  };
  aiReport?: IntelligenceReport;
}

// --- Simulation Regression Intelligence Agent (SRIA) ---

export type Confidence = "high" | "medium" | "low";
export type IntelVerdict = "GO" | "CONDITIONAL" | "NO-GO";

export interface BehavioralChange {
  metric: string;
  label: string;
  summary: string;
  conclusion: string;
  direction: "improved" | "regressed" | "neutral";
  severity: AnomalySeverity | "none";
  magnitudePct: number;
}

export interface RootCauseHypothesis {
  title: string;
  detail: string;
  confidence: Confidence;
  evidence: string[];
  relatedMetrics: string[];
}

export interface ValidationStep {
  action: string;
  rationale: string;
  priority: "P0" | "P1" | "P2";
}

export interface IntelligenceReport {
  kind: "run" | "comparison";
  subject: string;
  verdict: IntelVerdict;
  headline: string;
  behavioralChanges: BehavioralChange[];
  rootCauseHypotheses: RootCauseHypothesis[];
  validationSteps: ValidationStep[];
  confidence: Confidence;
  generatedBy: string;
}

export interface PortfolioRunEntry {
  candidateId: string;
  candidateName: string;
  verdict: IntelVerdict;
  overallImprovementPct: number;
  promotable: boolean;
  topIssue: string | null;
}

export interface PortfolioFailureMode {
  mode: string;
  affectedRuns: string[];
  confidence: Confidence;
}

export interface PortfolioReport {
  kind: "portfolio";
  baselineName: string;
  runCount: number;
  verdict: IntelVerdict;
  headline: string;
  promotable: string[];
  ranked: PortfolioRunEntry[];
  commonFailureModes: PortfolioFailureMode[];
  recommendedBaseline: string | null;
  validationSteps: ValidationStep[];
  generatedBy: string;
}

export interface MetricDelta {
  metric: string;
  label: string;
  baseline: number;
  candidate: number;
  absoluteDelta: number;
  percentDelta: number;
  isRegression: boolean;
  severity: AnomalySeverity | "none";
  unit: string;
  higherIsBetter: boolean;
}

export type OverallVerdict = "improved" | "neutral" | "regressed";

export interface ComparisonResult {
  baselineId: string;
  candidateId: string;
  baselineName: string;
  candidateName: string;
  deltas: MetricDelta[];
  regressions: MetricDelta[];
  overallImprovementPct: number;
  improvedCount: number;
  regressedCount: number;
  overallVerdict: OverallVerdict;
  promotable: boolean;
}

export interface BaselineState {
  runId: string;
  name: string;
  createdAt: number;
  lockedAt: number;
}

export interface BatchUploadResult {
  created: Array<{ id: string; name: string; createdAt: number; summary: RunSummaryMetrics; warnings: string[] }>;
  errors: Array<{ name: string; error: string }>;
}

export interface CompareAllResult {
  baseline: { id: string; name: string };
  comparisons: ComparisonResult[];
}

export interface PromoteResult {
  promoted: boolean;
  reason?: string;
  comparison: ComparisonResult;
  baseline: BaselineState | null;
}

export type ProviderChoice = "auto" | "openai" | "anthropic" | "openrouter" | "mock" | "ollama";

export interface PublicAiConfig {
  provider: ProviderChoice;
  activeProvider: string;
  openaiModel: string;
  anthropicModel: string;
  openrouterModel: string;
  openaiKeySet: boolean;
  anthropicKeySet: boolean;
  openrouterKeySet: boolean;
  openaiKeyPreview: string | null;
  anthropicKeyPreview: string | null;
  openrouterKeyPreview: string | null;
  source: {
    openai: "env" | "runtime" | "none";
    anthropic: "env" | "runtime" | "none";
    openrouter: "env" | "runtime" | "none";
  };
  ollamaBaseUrl: string;
  ollamaModel: string;
}

export interface SettingsPatch {
  provider?: ProviderChoice;
  openaiApiKey?: string | null;
  anthropicApiKey?: string | null;
  openrouterApiKey?: string | null;
  openaiModel?: string;
  anthropicModel?: string;
  openrouterModel?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  const body = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new Error((body as { error: string }).error ?? res.statusText);
  return body as T;
}

export const api = {
  health: () => request<{ status: string; aiProvider: string }>("/health"),

  listRuns: () => request<RunSummaryItem[]>("/runs"),

  getRun: (id: string) => request<RunDetail>(`/runs/${id}`),

  deleteRun: (id: string) =>
    fetch(`${BASE}/runs/${id}`, { method: "DELETE" }).then(() => undefined),

  uploadCsv: (file: File): Promise<RunDetail & { warnings: string[] }> => {
    const form = new FormData();
    form.append("file", file);
    form.append("name", file.name.replace(/\.csv$/i, ""));
    return request(`/runs`, { method: "POST", body: form });
  },

  uploadCsvBatch: (files: File[]): Promise<BatchUploadResult> => {
    const form = new FormData();
    for (const file of files) form.append("files", file);
    return request(`/runs/batch`, { method: "POST", body: form });
  },

  analyzeRun: (id: string) =>
    request<{ report: IntelligenceReport; provider: string }>(`/runs/${id}/intel`, { method: "POST" }),

  compareAll: (baselineId?: string) =>
    request<CompareAllResult>("/compare/all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(baselineId ? { baselineId } : {}),
    }),

  analyzePortfolio: (baselineId?: string) =>
    request<{ report: PortfolioReport; provider: string }>("/compare/all/intel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(baselineId ? { baselineId } : {}),
    }),

  compare: (baselineId: string, candidateId: string) =>
    request<ComparisonResult>("/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baselineId, candidateId }),
    }),

  analyzeComparison: (baselineId: string, candidateId: string) =>
    request<{ report: IntelligenceReport; provider: string; comparison: ComparisonResult }>("/compare/intel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baselineId, candidateId }),
    }),

  getSettings: () => request<PublicAiConfig>("/settings"),

  updateSettings: (patch: SettingsPatch) =>
    request<PublicAiConfig>("/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),

  testConnection: () =>
    request<{ ok: boolean; provider: string; message: string }>("/settings/test", { method: "POST" }),

  getBaseline: () => request<BaselineState | null>("/baseline"),

  setBaseline: (runId: string) =>
    request<BaselineState>("/baseline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId }),
    }),

  promoteBaseline: (candidateId: string) =>
    request<PromoteResult>("/baseline/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId }),
    }),
};
