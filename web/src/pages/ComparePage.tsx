import { useEffect, useState } from "react";
import { api, type ComparisonResult, type MetricDelta, type RunSummaryItem } from "../api.ts";
import { SeverityBadge } from "../components/Badge.tsx";
import { AiSummaryPanel } from "../components/AiSummaryPanel.tsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ComparePage() {
  const [runs, setRuns] = useState<RunSummaryItem[]>([]);
  const [baselineId, setBaselineId] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [aiSummary, setAiSummary] = useState<string | undefined>();
  const [aiProvider, setAiProvider] = useState<string | undefined>();
  const [aiLoading, setAiLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listRuns().then((rs) => {
      setRuns(rs);
      if (rs.length >= 1) setBaselineId(rs[rs.length > 1 ? rs.length - 1 : 0].id);
      if (rs.length >= 2) setCandidateId(rs[0].id);
    });
  }, []);

  const handleCompare = async () => {
    if (!baselineId || !candidateId || baselineId === candidateId) {
      setError("Select two different runs.");
      return;
    }
    setComparing(true);
    setError(null);
    setAiSummary(undefined);
    setComparison(null);
    try {
      const result = await api.compare(baselineId, candidateId);
      setComparison(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setComparing(false);
    }
  };

  const handleAiSummary = async () => {
    if (!baselineId || !candidateId) return;
    setAiLoading(true);
    try {
      const { summary, provider, comparison: cmp } = await api.compareSummarize(baselineId, candidateId);
      setComparison(cmp);
      setAiSummary(summary);
      setAiProvider(provider);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: 16,
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <RunSelector label="Baseline" runs={runs} value={baselineId} onChange={setBaselineId} exclude={candidateId} />
        <RunSelector label="Candidate" runs={runs} value={candidateId} onChange={setCandidateId} exclude={baselineId} />
        <button
          onClick={handleCompare}
          disabled={comparing || !baselineId || !candidateId || baselineId === candidateId}
          style={{
            padding: "7px 20px",
            background: comparing ? "var(--surface-2)" : "var(--accent)",
            color: comparing ? "var(--text-dim)" : "white",
            borderRadius: 4,
            fontWeight: 600,
            fontSize: 13,
            fontFamily: "var(--mono)",
            cursor: comparing ? "not-allowed" : "pointer",
          }}
        >
          {comparing ? "Comparing…" : "Compare"}
        </button>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "var(--critical-bg)", border: "1px solid var(--critical)", borderRadius: "var(--radius)", color: "var(--critical)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {comparison && (
        <>
          <RegressionSummaryBar regressions={comparison.regressions} />
          <DeltaTable deltas={comparison.deltas} />
          <DeltaBarChart deltas={comparison.deltas} />
          <AiSummaryPanel
            summary={aiSummary}
            provider={aiProvider}
            onGenerate={handleAiSummary}
            loading={aiLoading}
          />
        </>
      )}

      {runs.length < 2 && (
        <div style={{ color: "var(--text-dim)", fontSize: 13, fontFamily: "var(--mono)" }}>
          Upload at least two runs to enable comparison.
        </div>
      )}
    </div>
  );
}

function RunSelector({
  label, runs, value, onChange, exclude,
}: {
  label: string; runs: RunSummaryItem[]; value: string; onChange: (id: string) => void; exclude: string;
}) {
  return (
    <div style={{ flex: 1, minWidth: 180 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", fontFamily: "var(--mono)", marginBottom: 4, letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {label}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          color: "var(--text)",
          borderRadius: 4,
          padding: "6px 10px",
          fontSize: 13,
          fontFamily: "var(--mono)",
        }}
      >
        <option value="">— select a run —</option>
        {runs
          .filter((r) => r.id !== exclude)
          .map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} (DR {(r.summary.detectionRate * 100).toFixed(1)}%)
            </option>
          ))}
      </select>
    </div>
  );
}

function RegressionSummaryBar({ regressions }: { regressions: MetricDelta[] }) {
  const crit = regressions.filter((r) => r.severity === "critical").length;
  const warn = regressions.filter((r) => r.severity === "warning").length;
  const verdict = crit > 0 ? "NO-GO" : warn > 0 ? "CONDITIONAL" : "GO";
  const verdictColor = crit > 0 ? "var(--critical)" : warn > 0 ? "var(--warning)" : "var(--success)";

  return (
    <div
      style={{
        padding: "12px 16px",
        background: "var(--surface)",
        border: `1px solid ${verdictColor}55`,
        borderRadius: "var(--radius)",
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 18, color: verdictColor }}>
        {verdict}
      </span>
      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
        {regressions.length === 0
          ? "No metrics regressed beyond tolerance."
          : `${regressions.length} regression${regressions.length > 1 ? "s" : ""} detected: ${crit} critical, ${warn} warning.`}
      </span>
    </div>
  );
}

function DeltaTable({ deltas }: { deltas: MetricDelta[] }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", fontFamily: "var(--mono)", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Metric Deltas
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--mono)", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Metric", "Baseline", "Candidate", "Δ", "Δ%", "Status"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "7px 12px",
                    textAlign: "left",
                    color: "var(--text-muted)",
                    fontWeight: 600,
                    fontSize: 11,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    background: "var(--surface)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deltas.map((d) => {
              const isReg = d.isRegression;
              const improved = !isReg && d.severity === "none" && d.absoluteDelta !== 0;
              const rowColor = isReg
                ? d.severity === "critical"
                  ? "rgba(239,68,68,.04)"
                  : "rgba(245,158,11,.04)"
                : improved
                  ? "rgba(16,185,129,.03)"
                  : "transparent";
              const pctColor = isReg
                ? d.severity === "critical"
                  ? "var(--critical)"
                  : "var(--warning)"
                : improved
                  ? "var(--success)"
                  : "var(--text-dim)";

              return (
                <tr key={d.metric} style={{ borderBottom: "1px solid var(--border)", background: rowColor }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600, color: "var(--text)" }}>{d.label}</td>
                  <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>
                    {d.baseline}{d.unit}
                  </td>
                  <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>
                    {d.candidate}{d.unit}
                  </td>
                  <td style={{ padding: "8px 12px", color: pctColor }}>
                    {d.absoluteDelta > 0 ? "+" : ""}{d.absoluteDelta}{d.unit}
                  </td>
                  <td style={{ padding: "8px 12px", color: pctColor, fontWeight: 600 }}>
                    {d.percentDelta > 0 ? "+" : ""}{d.percentDelta}%
                  </td>
                  <td style={{ padding: "8px 12px" }}>
                    {d.isRegression ? (
                      <SeverityBadge severity={d.severity === "none" ? "info" : d.severity} />
                    ) : improved ? (
                      <span style={{ color: "var(--success)", fontSize: 11, fontWeight: 700 }}>IMPROVED</span>
                    ) : (
                      <span style={{ color: "var(--text-dim)", fontSize: 11 }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeltaBarChart({ deltas }: { deltas: MetricDelta[] }) {
  const data = deltas.map((d) => ({
    name: d.label.replace("Mean ", "").replace("Classification ", "Class. "),
    pct: d.percentDelta,
    isRegression: d.isRegression,
    severity: d.severity,
  }));

  const barColor = (d: (typeof data)[number]) => {
    if (!d.isRegression) return "var(--success)";
    return d.severity === "critical" ? "var(--critical)" : "var(--warning)";
  };

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", fontFamily: "var(--mono)", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Percent Change (Candidate vs Baseline)
      </div>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 8px" }}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 50, top: 4, bottom: 4 }}>
            <CartesianGrid stroke="var(--border)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "var(--text-dim)", fontSize: 10, fontFamily: "var(--mono)" }}
              axisLine={{ stroke: "var(--border)" }}
              tickLine={false}
              tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--mono)" }}
              axisLine={false}
              tickLine={false}
              width={120}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface-3)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                fontSize: 11,
                fontFamily: "var(--mono)",
                color: "var(--text)",
              }}
              formatter={(v: number) => [`${v > 0 ? "+" : ""}${v}%`, "Change"]}
            />
            <Bar dataKey="pct" isAnimationActive={false} radius={[0, 3, 3, 0]}>
              <LabelList
                dataKey="pct"
                position="right"
                formatter={(v: number) => `${v > 0 ? "+" : ""}${v}%`}
                style={{ fill: "var(--text-muted)", fontSize: 10, fontFamily: "var(--mono)" }}
              />
              {data.map((entry, index) => (
                <Cell key={index} fill={barColor(entry)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
