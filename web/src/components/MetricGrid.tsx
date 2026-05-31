import type { RunSummaryMetrics } from "../api.ts";

interface Metric {
  label: string;
  value: string;
  sub?: string;
  highlight?: "good" | "bad" | "neutral";
}

function buildMetrics(s: RunSummaryMetrics): Metric[] {
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  return [
    { label: "Detection Rate", value: pct(s.detectionRate), highlight: s.detectionRate < 0.9 ? "bad" : "good" },
    { label: "Classification Rate", value: pct(s.classificationRate), highlight: s.classificationRate < 0.9 ? "bad" : "good" },
    { label: "Mean Confidence", value: s.meanConfidence.toFixed(3), highlight: s.meanConfidence < 0.7 ? "bad" : "good" },
    { label: "Mean SNR", value: `${s.meanSnrDb} dB`, highlight: s.meanSnrDb < 8 ? "bad" : s.meanSnrDb < 12 ? "neutral" : "good" },
    { label: "Mean ΔT", value: `${s.meanDeltaTC} °C`, sub: "thermal contrast" },
    { label: "Mean NETD", value: `${s.meanNetdMk} mK`, highlight: s.meanNetdMk > 50 ? "bad" : "neutral" },
    { label: "Mean Latency", value: `${s.meanLatencyMs} ms`, sub: `p95 ${s.p95LatencyMs} ms`, highlight: s.meanLatencyMs > 60 ? "bad" : "neutral" },
    { label: "Track Error", value: `${s.meanTrackErrorM} m` },
    { label: "Dropped Frames", value: pct(s.droppedFrameRate), highlight: s.droppedFrameRate > 0.05 ? "bad" : "neutral" },
    { label: "Peak Sensor Temp", value: `${s.maxSensorTempC} °C`, highlight: s.maxSensorTempC > 65 ? "bad" : "neutral" },
    { label: "Frame Rate", value: `${s.meanFrameRateHz} Hz` },
    { label: "Duration", value: `${s.durationS}s`, sub: `${s.totalFrames} frames · ${s.uniqueTargets} targets` },
  ];
}

const HIGHLIGHT_COLOR = {
  good: "var(--success)",
  bad: "var(--critical)",
  neutral: "var(--text)",
};

export function MetricGrid({ summary }: { summary: RunSummaryMetrics }) {
  const metrics = buildMetrics(summary);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: 1,
        background: "var(--border)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }}
    >
      {metrics.map((m) => (
        <div
          key={m.label}
          style={{
            background: "var(--surface)",
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, fontWeight: 600, letterSpacing: "0.03em" }}>
            {m.label}
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              fontFamily: "var(--mono)",
              color: m.highlight ? HIGHLIGHT_COLOR[m.highlight] : "var(--text)",
              lineHeight: 1.2,
            }}
          >
            {m.value}
          </div>
          {m.sub && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{m.sub}</div>}
        </div>
      ))}
    </div>
  );
}
