import type { PortfolioReport } from "../api.ts";
import { ConfidenceBadge } from "./IntelligenceReportPanel.tsx";
import { PRIORITY_COLOR, verdictColor } from "./intelTheme.ts";

interface Props {
  report?: PortfolioReport;
  loading?: boolean;
  error?: string | null;
  onGenerate: () => void;
  onPromote?: (candidateId: string) => void;
  promoting?: boolean;
  disabled?: boolean;
}

export function PortfolioReportPanel({ report, loading, error, onGenerate, onPromote, promoting, disabled }: Props) {
  const recommendedId = report?.recommendedBaseline
    ? report.ranked.find((r) => r.candidateName === report.recommendedBaseline)?.candidateId
    : undefined;

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--mono)", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Portfolio Intelligence
          {report && <span style={{ marginLeft: 8, color: "var(--text-dim)", fontWeight: 400 }}>[{report.generatedBy}]</span>}
        </span>
        <button
          onClick={onGenerate}
          disabled={loading || disabled}
          style={{
            fontSize: 12,
            fontFamily: "var(--mono)",
            padding: "4px 12px",
            borderRadius: 4,
            background: loading || disabled ? "var(--surface-2)" : "var(--accent)",
            color: loading || disabled ? "var(--text-dim)" : "white",
            cursor: loading || disabled ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Analyzing…" : report ? "Re-run agent" : "Run portfolio agent"}
        </button>
      </div>

      <div style={{ padding: 16 }}>
        {error && <div style={{ color: "var(--critical)", fontSize: 12, marginBottom: 8 }}>{error}</div>}
        {!report ? (
          <p style={{ color: "var(--text-dim)", fontSize: 12 }}>
            Run the agent to rank every run against the baseline, surface dominant failure modes, and get a recommended baseline.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", padding: "12px 14px", border: `1px solid ${verdictColor(report.verdict)}55`, borderRadius: "var(--radius)", background: `${verdictColor(report.verdict)}0d` }}>
              <span style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 18, color: verdictColor(report.verdict) }}>{report.verdict}</span>
              <span style={{ flex: 1, minWidth: 220, fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{report.headline}</span>
              {recommendedId && onPromote && (
                <button
                  onClick={() => onPromote(recommendedId)}
                  disabled={promoting}
                  style={{ padding: "6px 14px", borderRadius: 4, fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, background: promoting ? "var(--surface-2)" : "var(--success)", color: promoting ? "var(--text-dim)" : "white", cursor: promoting ? "not-allowed" : "pointer" }}
                >
                  Promote {report.recommendedBaseline}
                </button>
              )}
            </div>

            {report.commonFailureModes.length > 0 && (
              <div>
                <Label>Dominant Failure Modes</Label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {report.commonFailureModes.map((m, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                      <ConfidenceBadge confidence={m.confidence} />
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{m.mode}</span>
                      <span style={{ fontSize: 11.5, fontFamily: "var(--mono)", color: "var(--text-dim)" }}>
                        {m.affectedRuns.length} run(s): {m.affectedRuns.join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label>Ranked vs Baseline "{report.baselineName}"</Label>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--mono)", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)" }}>
                      {["#", "Run", "Verdict", "Overall Δ%", "Top Issue"].map((h) => (
                        <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.ranked.map((r, i) => (
                      <tr key={r.candidateId} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "7px 10px", color: "var(--text-dim)" }}>{i + 1}</td>
                        <td style={{ padding: "7px 10px", fontWeight: 600, color: "var(--text)" }}>
                          {r.candidateName}
                          {r.promotable && <span style={{ marginLeft: 6, color: "var(--success)", fontSize: 10, fontWeight: 700 }}>✓</span>}
                        </td>
                        <td style={{ padding: "7px 10px", color: verdictColor(r.verdict), fontWeight: 700 }}>{r.verdict}</td>
                        <td style={{ padding: "7px 10px", color: verdictColor(r.verdict) }}>{r.overallImprovementPct > 0 ? "+" : ""}{r.overallImprovementPct}%</td>
                        <td style={{ padding: "7px 10px", color: "var(--text-dim)" }}>{r.topIssue ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {report.validationSteps.length > 0 && (
              <div>
                <Label>Recommended Actions</Label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {report.validationSteps.map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--mono)", color: PRIORITY_COLOR[s.priority], border: `1px solid ${PRIORITY_COLOR[s.priority]}`, borderRadius: 3, padding: "1px 6px", flexShrink: 0 }}>{s.priority}</span>
                      <div>
                        <div style={{ fontSize: 12.5, color: "var(--text)" }}>{s.action}</div>
                        {s.rationale && <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginTop: 2 }}>{s.rationale}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", fontFamily: "var(--mono)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
      {children}
    </div>
  );
}
