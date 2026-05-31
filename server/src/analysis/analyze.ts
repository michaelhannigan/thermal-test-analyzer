import type { FrameRecord, RunAnalysis, RunSummary, TimeSeriesPoint } from "../types.js";
import { detectAnomalies } from "./anomalies.js";
import { mean, percentile, round } from "./stats.js";

function summarize(frames: FrameRecord[]): RunSummary {
  const n = frames.length;
  const timestamps = frames.map((f) => f.timestamp);
  const t0 = Math.min(...timestamps);
  const t1 = Math.max(...timestamps);
  const latencies = frames.map((f) => f.classificationLatencyMs);

  return {
    totalFrames: n,
    durationS: round((t1 - t0) / 1000),
    detectionRate: round(frames.filter((f) => f.detected).length / n, 4),
    classificationRate: round(frames.filter((f) => f.classified).length / n, 4),
    droppedFrameRate: round(frames.filter((f) => f.droppedFrame).length / n, 4),
    meanSnrDb: round(mean(frames.map((f) => f.snrDb))),
    meanDeltaTC: round(mean(frames.map((f) => f.deltaTC))),
    meanNetdMk: round(mean(frames.map((f) => f.netdMk))),
    meanConfidence: round(mean(frames.map((f) => f.detectionConfidence)), 4),
    meanLatencyMs: round(mean(latencies)),
    p95LatencyMs: round(percentile(latencies, 95)),
    meanTrackErrorM: round(mean(frames.map((f) => f.trackErrorM))),
    maxSensorTempC: round(Math.max(...frames.map((f) => f.sensorTempC))),
    meanFrameRateHz: round(mean(frames.map((f) => f.frameRateHz))),
    uniqueTargets: new Set(frames.map((f) => f.targetId)).size,
  };
}

// Downsample to at most `maxPoints` evenly-spaced points for charting.
function buildTimeSeries(frames: FrameRecord[], maxPoints = 200): TimeSeriesPoint[] {
  const sorted = [...frames].sort((a, b) => a.timestamp - b.timestamp);
  const t0 = sorted[0].timestamp;
  const step = Math.max(1, Math.floor(sorted.length / maxPoints));
  const points: TimeSeriesPoint[] = [];
  for (let i = 0; i < sorted.length; i += step) {
    const f = sorted[i];
    points.push({
      t: round((f.timestamp - t0) / 1000),
      snrDb: round(f.snrDb),
      deltaTC: round(f.deltaTC),
      detectionConfidence: round(f.detectionConfidence, 3),
      sensorTempC: round(f.sensorTempC),
      classificationLatencyMs: round(f.classificationLatencyMs),
    });
  }
  return points;
}

export function analyzeRun(frames: FrameRecord[]): RunAnalysis {
  return {
    summary: summarize(frames),
    anomalies: detectAnomalies(frames),
    timeSeries: buildTimeSeries(frames),
  };
}
