const BASE = "/api";

export interface RunSummaryItem {
  id: string;
  name: string;
  createdAt: number;
  summary: RunSummaryMetrics;
  anomalyCount: number;
  criticalCount: number;
  hasAiSummary: boolean;
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
  aiSummary?: string;
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

export interface ComparisonResult {
  baselineId: string;
  candidateId: string;
  baselineName: string;
  candidateName: string;
  deltas: MetricDelta[];
  regressions: MetricDelta[];
}

export type ProviderChoice = "auto" | "openai" | "anthropic" | "mock";

export interface PublicAiConfig {
  provider: ProviderChoice;
  activeProvider: string;
  openaiModel: string;
  anthropicModel: string;
  openaiKeySet: boolean;
  anthropicKeySet: boolean;
  openaiKeyPreview: string | null;
  anthropicKeyPreview: string | null;
  source: { openai: "env" | "runtime" | "none"; anthropic: "env" | "runtime" | "none" };
}

export interface SettingsPatch {
  provider?: ProviderChoice;
  openaiApiKey?: string | null;
  anthropicApiKey?: string | null;
  openaiModel?: string;
  anthropicModel?: string;
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

  summarizeRun: (id: string) =>
    request<{ summary: string; provider: string }>(`/runs/${id}/summarize`, { method: "POST" }),

  compare: (baselineId: string, candidateId: string) =>
    request<ComparisonResult>("/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baselineId, candidateId }),
    }),

  compareSummarize: (baselineId: string, candidateId: string) =>
    request<{ summary: string; provider: string; comparison: ComparisonResult }>("/compare/summarize", {
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
};
