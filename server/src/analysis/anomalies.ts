import type { Anomaly, FrameRecord } from "../types.js";
import { mean, round, stddev } from "./stats.js";

// Domain thresholds for thermal imaging effectiveness.
const THRESHOLDS = {
  lowSnrDb: 6, // below this, detection is unreliable
  criticalSnrDb: 3,
  sensorOverheatC: 65, // sensor core temperature ceiling
  sensorCriticalC: 75,
  shortRangeM: 800, // a target at/under this range with strong contrast should be detected
  strongContrastC: 2.0,
  highNetdMk: 50, // elevated sensor noise floor
  latencyZScore: 3, // latency spike detection
  trackErrorZScore: 3,
};

let counter = 0;
function nextId(): string {
  counter += 1;
  return `anom-${counter}`;
}

export function detectAnomalies(frames: FrameRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // 1. Low SNR frames.
  const lowSnr = frames.filter((f) => f.snrDb < THRESHOLDS.lowSnrDb);
  if (lowSnr.length > 0) {
    const critical = lowSnr.filter((f) => f.snrDb < THRESHOLDS.criticalSnrDb);
    const worst = Math.min(...lowSnr.map((f) => f.snrDb));
    anomalies.push({
      id: nextId(),
      category: "Signal Quality",
      severity: critical.length > 0 ? "critical" : "warning",
      title: `Low SNR on ${lowSnr.length} frame(s)`,
      description:
        `${lowSnr.length} frames fell below the ${THRESHOLDS.lowSnrDb} dB reliable-detection floor` +
        (critical.length > 0 ? `, including ${critical.length} below the critical ${THRESHOLDS.criticalSnrDb} dB level.` : ".") +
        ` Worst observed SNR was ${round(worst)} dB.`,
      metric: "snrDb",
      frameIds: lowSnr.slice(0, 50).map((f) => f.frameId),
      affectedCount: lowSnr.length,
      observedValue: round(worst),
      threshold: THRESHOLDS.lowSnrDb,
    });
  }

  // 2. Missed detections on close, high-contrast targets.
  const missed = frames.filter(
    (f) => !f.detected && f.rangeM > 0 && f.rangeM <= THRESHOLDS.shortRangeM && f.deltaTC >= THRESHOLDS.strongContrastC,
  );
  if (missed.length > 0) {
    anomalies.push({
      id: nextId(),
      category: "Detection",
      severity: "critical",
      title: `${missed.length} missed detection(s) on close high-contrast targets`,
      description:
        `${missed.length} frames had a target within ${THRESHOLDS.shortRangeM} m with thermal contrast ` +
        `>= ${THRESHOLDS.strongContrastC} C yet produced no detection. These are high-confidence false negatives.`,
      metric: "detected",
      frameIds: missed.slice(0, 50).map((f) => f.frameId),
      affectedCount: missed.length,
      observedValue: missed.length,
      threshold: 0,
    });
  }

  // 3. Sensor overheating.
  const hot = frames.filter((f) => f.sensorTempC >= THRESHOLDS.sensorOverheatC);
  if (hot.length > 0) {
    const maxT = Math.max(...hot.map((f) => f.sensorTempC));
    anomalies.push({
      id: nextId(),
      category: "Thermal/Hardware",
      severity: maxT >= THRESHOLDS.sensorCriticalC ? "critical" : "warning",
      title: `Sensor temperature exceeded ${THRESHOLDS.sensorOverheatC} C`,
      description:
        `Sensor core temperature crossed the ${THRESHOLDS.sensorOverheatC} C threshold on ${hot.length} frames, ` +
        `peaking at ${round(maxT)} C. Elevated core temperature raises the noise floor and degrades detection.`,
      metric: "sensorTempC",
      frameIds: hot.slice(0, 50).map((f) => f.frameId),
      affectedCount: hot.length,
      observedValue: round(maxT),
      threshold: THRESHOLDS.sensorOverheatC,
    });
  }

  // 4. Classification latency spikes (statistical).
  const latencies = frames.map((f) => f.classificationLatencyMs);
  const latMean = mean(latencies);
  const latStd = stddev(latencies, latMean);
  if (latStd > 0) {
    const spikes = frames.filter((f) => (f.classificationLatencyMs - latMean) / latStd > THRESHOLDS.latencyZScore);
    if (spikes.length > 0) {
      const maxLat = Math.max(...spikes.map((f) => f.classificationLatencyMs));
      anomalies.push({
        id: nextId(),
        category: "Latency",
        severity: "warning",
        title: `${spikes.length} classification latency spike(s)`,
        description:
          `${spikes.length} frames exceeded ${THRESHOLDS.latencyZScore}σ above the mean latency of ${round(latMean)} ms ` +
          `(σ=${round(latStd)} ms), peaking at ${round(maxLat)} ms.`,
        metric: "classificationLatencyMs",
        frameIds: spikes.slice(0, 50).map((f) => f.frameId),
        affectedCount: spikes.length,
        observedValue: round(maxLat),
        threshold: round(latMean + THRESHOLDS.latencyZScore * latStd),
      });
    }
  }

  // 5. Elevated NETD (sensor noise floor).
  const noisy = frames.filter((f) => f.netdMk > THRESHOLDS.highNetdMk);
  if (noisy.length > 0) {
    const maxNetd = Math.max(...noisy.map((f) => f.netdMk));
    anomalies.push({
      id: nextId(),
      category: "Signal Quality",
      severity: "warning",
      title: `Elevated NETD on ${noisy.length} frame(s)`,
      description:
        `Noise-equivalent temperature difference exceeded ${THRESHOLDS.highNetdMk} mK on ${noisy.length} frames ` +
        `(peak ${round(maxNetd)} mK), indicating a degraded sensor noise floor.`,
      metric: "netdMk",
      frameIds: noisy.slice(0, 50).map((f) => f.frameId),
      affectedCount: noisy.length,
      observedValue: round(maxNetd),
      threshold: THRESHOLDS.highNetdMk,
    });
  }

  // 6. Tracking error outliers.
  const trackErrors = frames.map((f) => f.trackErrorM);
  const teMean = mean(trackErrors);
  const teStd = stddev(trackErrors, teMean);
  if (teStd > 0) {
    const outliers = frames.filter((f) => (f.trackErrorM - teMean) / teStd > THRESHOLDS.trackErrorZScore);
    if (outliers.length > 0) {
      const maxErr = Math.max(...outliers.map((f) => f.trackErrorM));
      anomalies.push({
        id: nextId(),
        category: "Tracking",
        severity: "warning",
        title: `${outliers.length} tracking-error outlier(s)`,
        description:
          `${outliers.length} frames had tracking error beyond ${THRESHOLDS.trackErrorZScore}σ of the mean ` +
          `(${round(teMean)} m), peaking at ${round(maxErr)} m.`,
        metric: "trackErrorM",
        frameIds: outliers.slice(0, 50).map((f) => f.frameId),
        affectedCount: outliers.length,
        observedValue: round(maxErr),
        threshold: round(teMean + THRESHOLDS.trackErrorZScore * teStd),
      });
    }
  }

  // 7. Dropped frame bursts.
  const dropped = frames.filter((f) => f.droppedFrame);
  if (dropped.length > 0) {
    const rate = dropped.length / frames.length;
    anomalies.push({
      id: nextId(),
      category: "Pipeline",
      severity: rate > 0.05 ? "critical" : "info",
      title: `${dropped.length} dropped frame(s)`,
      description:
        `${round(rate * 100)}% of frames were dropped by the imaging pipeline. ` +
        `Sustained drops reduce effective frame rate and tracking continuity.`,
      metric: "droppedFrame",
      frameIds: dropped.slice(0, 50).map((f) => f.frameId),
      affectedCount: dropped.length,
      observedValue: round(rate * 100),
      threshold: 5,
    });
  }

  const order = { critical: 0, warning: 1, info: 2 } as const;
  return anomalies.sort((a, b) => order[a.severity] - order[b.severity]);
}
