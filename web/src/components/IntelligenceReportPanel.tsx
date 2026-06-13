import { useState } from "react";
import type { Confidence, IntelligenceReport } from "../api.ts";
import { PRIORITY_COLOR, verdictColor } from "./intelTheme.ts";

interface Props {
  report?: IntelligenceReport;
  provider?: string;
  onGenerate: () => Promise<void>;
  loading?: boolean;
  title?: string;
}

const CONF_LABEL: Record<Confidence, string> = { high: "HIGH", medium: "MED", low: "LOW" };

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const color = confidence === "high" ? "var(--success)" : confidence === "medium" ? "var(--warning)" : "var(--text-dim)";
  return (
    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--mono)", color, border: `1px solid ${color}`, borderRadius: 3, padding: "1px 6px", letterSpacing: "0.05em" }}>
      {CONF_LABEL[confidence]} CONF
    </span>
  );
}

export function IntelligenceReportPanel({ report, provider, onGenerate, loading, title = "Regression Intelligence" }: Props) {
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setError(null);
    try {
      await onGenerate();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const by = report?.generatedBy ?? provider;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--mono)", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {title}
          {by && <span style={{ marginLeft: 8, color: "var(--text-dim)", fontWeight: 400 }}>[{by}]</span>}
        </span>
        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            fontSize: 12,
            fontFamily: "var(--mono)",
            padding: "4px 12px",
            borderRadius: 4,
            background: loading ? "var(--surface-2)" : "var(--accent)",
            color: loading ? "var(--text-dim)" : "white",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Analyzing…" : report ? "Re-run agent" : "Run agent"}
        </button>
      </div>

      <div style={{ padding: 16 }}>
        {error && <div style={{ color: "var(--critical)", fontSize: 12, marginBottom: 8 }}>{error}</div>}
        {!report ? (
          <p style={{ color: "var(--text-dim)", fontSize: 12 }}>
            Run the agent to identify behavioral changes, generate ranked root-cause hypotheses, and get prioritized validation steps.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Verdict report={report} />
            <BehavioralChanges report={report} />
            <Hypotheses report={report} />
            <ValidationSteps report={report} />
          </div>
        )}
      </div>
    </div>
  );
}

function Verdict({ report }: { report: IntelligenceReport }) {
  const color = verdictColor(report.verdict);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "12px 14px", border: `1px solid ${color}55`, borderRadius: "var(--radius)", background: `${color}0d` }}>
      <span style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 18, color }}>{report.verdict}</span>
      <ConfidenceBadge confidence={report.confidence} />
      <span style={{ flex: 1, minWidth: 220, fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{report.headline}</span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", fontFamily: "var(--mono)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
      {children}
    </div>
  );
}

function BehavioralChanges({ report }: { report: IntelligenceReport }) {
  if (report.behavioralChanges.length === 0) {
    return (
      <div>
        <SectionLabel>Behavioral Changes</SectionLabel>
        <div style={{ fontSize: 12, color: "var(--text-dim)" }}>No meaningful behavioral changes detected.</div>
      </div>
    );
  }
  const dirColor = (d: string, sev: string) =>
    d === "improved" ? "var(--success)" : sev === "critical" ? "var(--critical)" : sev === "warning" ? "var(--warning)" : "var(--text-muted)";
  return (
    <div>
      <SectionLabel>Behavioral Changes ({report.behavioralChanges.length})</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {report.behavioralChanges.map((b, i) => (
          <div key={i} style={{ display: "flex", gap: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: dirColor(b.direction, b.severity), flexShrink: 0, marginTop: 6 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ color: "var(--text)", fontFamily: "var(--mono)", fontSize: 12.5, fontWeight: 600 }}>{b.summary}</span>
              {b.conclusion && (
                <span style={{ color: "var(--text-muted)", fontSize: 12.5, lineHeight: 1.55 }}>{b.conclusion}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Hypotheses({ report }: { report: IntelligenceReport }) {
  if (report.rootCauseHypotheses.length === 0) return null;
  return (
    <div>
      <SectionLabel>Root-Cause Hypotheses ({report.rootCauseHypotheses.length})</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {report.rootCauseHypotheses.map((h, i) => (
          <div key={i} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 12, background: "var(--surface-2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{i + 1}. {h.title}</span>
              <ConfidenceBadge confidence={h.confidence} />
            </div>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.55, margin: "0 0 8px" }}>{h.detail}</p>
            {h.evidence.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {h.evidence.map((e, j) => (
                  <div key={j} style={{ fontSize: 11.5, fontFamily: "var(--mono)", color: "var(--text-dim)", display: "flex", gap: 6 }}>
                    <span style={{ color: "var(--accent)" }}>▸</span>
                    <span>{e}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ValidationSteps({ report }: { report: IntelligenceReport }) {
  if (report.validationSteps.length === 0) return null;
  return (
    <div>
      <SectionLabel>Recommended Validation Steps ({report.validationSteps.length})</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {report.validationSteps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
            <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--mono)", color: PRIORITY_COLOR[s.priority], border: `1px solid ${PRIORITY_COLOR[s.priority]}`, borderRadius: 3, padding: "1px 6px", flexShrink: 0 }}>
              {s.priority}
            </span>
            <div>
              <div style={{ fontSize: 12.5, color: "var(--text)" }}>{s.action}</div>
              {s.rationale && <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 2 }}>{s.rationale}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
