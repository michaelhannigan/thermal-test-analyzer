// Domain types for thermal imaging effectiveness test logs.

// A single sampled frame from a thermal imaging effectiveness test.
export interface FrameRecord {
  timestamp: number; // epoch ms
  frameId: number;
  targetId: string;
  rangeM: number; // distance to target in meters
  ambientTempC: number; // background/ambient temperature
  targetTempC: number; // measured target temperature
  deltaTC: number; // thermal contrast (target - background)
  snrDb: number; // signal-to-noise ratio
  netdMk: number; // noise-equivalent temperature difference (milli-kelvin)
  detectionConfidence: number; // 0..1
  detected: boolean;
  classified: boolean;
  classificationLatencyMs: number;
  trackErrorM: number; // tracking position error in meters
  sensorTempC: number; // sensor core temperature
  frameRateHz: number;
  droppedFrame: boolean;
}

export interface RunSummary {
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

export interface RunAnalysis {
  summary: RunSummary;
  anomalies: Anomaly[];
  timeSeries: TimeSeriesPoint[];
}

export interface TimeSeriesPoint {
  t: number; // seconds from start
  snrDb: number;
  deltaTC: number;
  detectionConfidence: number;
  sensorTempC: number;
  classificationLatencyMs: number;
}

export interface StoredRun {
  id: string;
  name: string;
  createdAt: number;
  frames: FrameRecord[];
  analysis: RunAnalysis;
  aiReport?: IntelligenceReport;
}

// --- Simulation Regression Intelligence Agent (SRIA) ---

export type Confidence = "high" | "medium" | "low";

// Engineering decision gate produced by the agent.
export type IntelVerdict = "GO" | "CONDITIONAL" | "NO-GO";

// A meaningful, noise-filtered shift in a single metric.
export interface BehavioralChange {
  metric: string;
  label: string;
  summary: string; // concise, e.g. "Mean SNR decreased by 30.1% (18.2dB → 12.7dB) compared to the baseline."
  conclusion: string; // actionable engineering narrative: implication, cross-metric impact, recommended action
  direction: "improved" | "regressed" | "neutral";
  severity: AnomalySeverity | "none";
  magnitudePct: number;
}

export interface RootCauseHypothesis {
  title: string;
  detail: string;
  confidence: Confidence;
  evidence: string[]; // metric movements / anomalies supporting the hypothesis
  relatedMetrics: string[];
}

export interface ValidationStep {
  action: string;
  rationale: string;
  priority: "P0" | "P1" | "P2";
}

export interface IntelligenceReport {
  kind: "run" | "comparison";
  subject: string; // run name, or "candidate vs baseline"
  verdict: IntelVerdict;
  headline: string; // one-sentence actionable conclusion
  behavioralChanges: BehavioralChange[];
  rootCauseHypotheses: RootCauseHypothesis[];
  validationSteps: ValidationStep[];
  confidence: Confidence; // overall confidence in the conclusions
  generatedBy: string; // provider name
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
  // true when the change direction is a regression (worse performance)
  isRegression: boolean;
  // qualitative magnitude for the candidate-vs-baseline change
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
  // Mean of direction-aware per-metric improvement percentages (positive = better).
  overallImprovementPct: number;
  improvedCount: number;
  regressedCount: number;
  overallVerdict: OverallVerdict;
  // True when the candidate has zero regressions AND a positive aggregate improvement.
  promotable: boolean;
}

// Currently locked baseline run used for promotion comparisons.
export interface BaselineState {
  runId: string;
  name: string;
  createdAt: number;
  lockedAt: number;
}
