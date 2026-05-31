import type { Anomaly } from "../api.ts";
import { SeverityBadge } from "./Badge.tsx";

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 } as const;

export function AnomalyList({ anomalies }: { anomalies: Anomaly[] }) {
  if (anomalies.length === 0) {
    return (
      <div
        style={{
          padding: "24px 0",
          textAlign: "center",
          color: "var(--success)",
          fontFamily: "var(--mono)",
          fontSize: 13,
        }}
      >
        No anomalies detected — all metrics within nominal bounds.
      </div>
    );
  }

  const sorted = [...anomalies].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border)" }}>
      {sorted.map((a) => (
        <div
          key={a.id}
          style={{
            background: "var(--surface)",
            padding: "12px 14px",
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "8px 12px",
            alignItems: "start",
          }}
        >
          <SeverityBadge severity={a.severity} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{a.title}</span>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-dim)",
                  fontFamily: "var(--mono)",
                  padding: "1px 6px",
                  background: "var(--surface-2)",
                  borderRadius: 3,
                }}
              >
                {a.category}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, lineHeight: 1.6 }}>{a.description}</p>
            <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--mono)" }}>
              <span>affected: {a.affectedCount}</span>
              <span>observed: {a.observedValue}</span>
              <span>threshold: {a.threshold}</span>
              <span>metric: {a.metric}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
