import type { ComparisonResult, MetricDelta, RunSummary, StoredRun } from "../types.js";
import { round } from "./stats.js";

interface MetricSpec {
  key: keyof RunSummary;
  label: string;
  unit: string;
  higherIsBetter: boolean;
  // percent-delta magnitude (abs) above which a regression is flagged
  warnPct: number;
  critPct: number;
}

const METRICS: MetricSpec[] = [
  { key: "detectionRate", label: "Detection Rate", unit: "%", higherIsBetter: true, warnPct: 2, critPct: 5 },
  { key: "classificationRate", label: "Classification Rate", unit: "%", higherIsBetter: true, warnPct: 2, critPct: 5 },
  { key: "meanConfidence", label: "Mean Confidence", unit: "", higherIsBetter: true, warnPct: 3, critPct: 8 },
  { key: "meanSnrDb", label: "Mean SNR", unit: "dB", higherIsBetter: true, warnPct: 5, critPct: 12 },
  { key: "meanDeltaTC", label: "Mean Thermal Contrast", unit: "C", higherIsBetter: true, warnPct: 5, critPct: 15 },
  { key: "meanNetdMk", label: "Mean NETD", unit: "mK", higherIsBetter: false, warnPct: 8, critPct: 20 },
  { key: "meanLatencyMs", label: "Mean Latency", unit: "ms", higherIsBetter: false, warnPct: 10, critPct: 25 },
  { key: "p95LatencyMs", label: "P95 Latency", unit: "ms", higherIsBetter: false, warnPct: 10, critPct: 25 },
  { key: "meanTrackErrorM", label: "Mean Track Error", unit: "m", higherIsBetter: false, warnPct: 10, critPct: 25 },
  { key: "droppedFrameRate", label: "Dropped Frame Rate", unit: "%", higherIsBetter: false, warnPct: 20, critPct: 50 },
  { key: "maxSensorTempC", label: "Max Sensor Temp", unit: "C", higherIsBetter: false, warnPct: 5, critPct: 12 },
  { key: "meanFrameRateHz", label: "Mean Frame Rate", unit: "Hz", higherIsBetter: true, warnPct: 5, critPct: 12 },
];

// Rates are stored 0..1 but presented as percentages.
const PERCENT_KEYS = new Set<keyof RunSummary>(["detectionRate", "classificationRate", "droppedFrameRate"]);

function buildDelta(spec: MetricSpec, baseline: RunSummary, candidate: RunSummary): MetricDelta {
  const scale = PERCENT_KEYS.has(spec.key) ? 100 : 1;
  const b = (baseline[spec.key] as number) * scale;
  const c = (candidate[spec.key] as number) * scale;
  const abs = c - b;
  const pct = b !== 0 ? (abs / Math.abs(b)) * 100 : c !== 0 ? 100 : 0;

  // A change is "worse" when it moves against the preferred direction.
  const improved = spec.higherIsBetter ? abs > 0 : abs < 0;
  const magnitude = Math.abs(pct);

  let severity: MetricDelta["severity"] = "none";
  let isRegression = false;
  if (!improved && magnitude > 0) {
    if (magnitude >= spec.critPct) severity = "critical";
    else if (magnitude >= spec.warnPct) severity = "warning";
    else severity = "info";
    isRegression = severity === "critical" || severity === "warning";
  }

  return {
    metric: spec.key,
    label: spec.label,
    baseline: round(b, 3),
    candidate: round(c, 3),
    absoluteDelta: round(abs, 3),
    percentDelta: round(pct, 2),
    isRegression,
    severity,
    unit: spec.unit,
    higherIsBetter: spec.higherIsBetter,
  };
}

// Direction-aware improvement percentage for a single metric (positive = better).
function improvementPct(d: MetricDelta): number {
  return d.higherIsBetter ? d.percentDelta : -d.percentDelta;
}

// Minimum mean improvement (in %) required to consider a candidate genuinely better.
const PROMOTION_EPSILON = 0.01;

export function compareRuns(baseline: StoredRun, candidate: StoredRun): ComparisonResult {
  const deltas = METRICS.map((spec) => buildDelta(spec, baseline.analysis.summary, candidate.analysis.summary));
  const order = { critical: 0, warning: 1, info: 2, none: 3 } as const;
  const regressions = deltas
    .filter((d) => d.isRegression)
    .sort((a, b) => order[a.severity] - order[b.severity]);

  const improvedCount = deltas.filter((d) => improvementPct(d) > 0).length;
  const regressedCount = deltas.filter((d) => improvementPct(d) < 0).length;
  const overallImprovementPct =
    deltas.length > 0 ? round(deltas.reduce((sum, d) => sum + improvementPct(d), 0) / deltas.length, 2) : 0;

  const overallVerdict: ComparisonResult["overallVerdict"] =
    regressions.length > 0 ? "regressed" : overallImprovementPct > PROMOTION_EPSILON ? "improved" : "neutral";
  const promotable = regressions.length === 0 && overallImprovementPct > PROMOTION_EPSILON;

  return {
    baselineId: baseline.id,
    candidateId: candidate.id,
    baselineName: baseline.name,
    candidateName: candidate.name,
    deltas,
    regressions,
    overallImprovementPct,
    improvedCount,
    regressedCount,
    overallVerdict,
    promotable,
  };
}
