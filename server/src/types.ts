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
  aiSummary?: string;
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

export interface ComparisonResult {
  baselineId: string;
  candidateId: string;
  baselineName: string;
  candidateName: string;
  deltas: MetricDelta[];
  regressions: MetricDelta[];
  aiSummary?: string;
}
