import { useEffect, useRef, useState } from "react";
import {
  api,
  type BaselineState,
  type CompareAllResult,
  type ComparisonResult,
  type IntelligenceReport,
  type MetricDelta,
  type PortfolioReport,
  type RunSummaryItem,
} from "../api.ts";
import { SeverityBadge } from "../components/Badge.tsx";
import { IntelligenceReportPanel } from "../components/IntelligenceReportPanel.tsx";
import { PortfolioReportPanel } from "../components/PortfolioReportPanel.tsx";
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

export function ComparePage({ compareAllTrigger = 0 }: { compareAllTrigger?: number }) {
  const [runs, setRuns] = useState<RunSummaryItem[]>([]);
  const [baselineId, setBaselineId] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [intelReport, setIntelReport] = useState<IntelligenceReport | undefined>();
  const [aiProvider, setAiProvider] = useState<string | undefined>();
  const [aiLoading, setAiLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<BaselineState | null>(null);
  const [promoting, setPromoting] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);
  const [allResult, setAllResult] = useState<CompareAllResult | null>(null);
  const [allLoading, setAllLoading] = useState(false);
  const [allError, setAllError] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioReport | undefined>();
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const lastTrigger = useRef(0);

  const refreshBaseline = () => api.getBaseline().then(setBaseline).catch(() => undefined);

  const flash = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const handleCompareAll = async () => {
    setAllLoading(true);
    setAllError(null);
    try {
      const [result] = await Promise.all([api.compareAll(), api.listRuns().then(setRuns), refreshBaseline()]);
      setAllResult(result);
    } catch (e) {
      setAllResult(null);
      setAllError((e as Error).message);
    } finally {
      setAllLoading(false);
    }
  };

  const handleAnalyzePortfolio = async () => {
    setPortfolioLoading(true);
    setPortfolioError(null);
    try {
      const { report } = await api.analyzePortfolio();
      setPortfolio(report);
    } catch (e) {
      setPortfolio(undefined);
      setPortfolioError((e as Error).message);
    } finally {
      setPortfolioLoading(false);
    }
  };

  const handlePromoteFrom = async (id: string) => {
    setPromoting(true);
    try {
      const result = await api.promoteBaseline(id);
      if (result.promoted) {
        await Promise.all([refreshBaseline(), handleCompareAll(), handleAnalyzePortfolio()]);
        flash(true, `Promoted "${result.comparison.candidateName}" to the new locked baseline.`);
      } else {
        flash(false, `Not promoted: ${result.reason ?? "candidate did not beat the baseline."}`);
      }
    } catch (e) {
      flash(false, (e as Error).message);
    } finally {
      setPromoting(false);
    }
  };

  useEffect(() => {
    if (compareAllTrigger > 0 && compareAllTrigger !== lastTrigger.current) {
      lastTrigger.current = compareAllTrigger;
      handleCompareAll();
      handleAnalyzePortfolio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compareAllTrigger]);

  useEffect(() => {
    Promise.all([api.listRuns(), api.getBaseline()]).then(([rs, bl]) => {
      setRuns(rs);
      setBaseline(bl);
      // Default the baseline selector to the locked baseline when available.
      if (bl && rs.some((r) => r.id === bl.runId)) setBaselineId(bl.runId);
      else if (rs.length >= 1) setBaselineId(rs[rs.length > 1 ? rs.length - 1 : 0].id);
      if (rs.length >= 2) setCandidateId(rs.find((r) => r.id !== (bl?.runId ?? ""))?.id ?? rs[0].id);
    });
  }, []);

  const handlePromote = async () => {
    if (!candidateId) return;
    setPromoting(true);
    try {
      const result = await api.promoteBaseline(candidateId);
      setComparison(result.comparison);
      if (result.promoted) {
        await refreshBaseline();
        flash(true, `Promoted "${result.comparison.candidateName}" to the new locked baseline.`);
      } else {
        flash(false, `Not promoted: ${result.reason ?? "candidate did not beat the baseline."}`);
      }
    } catch (e) {
      flash(false, (e as Error).message);
    } finally {
      setPromoting(false);
    }
  };

  const handleForceSetBaseline = async () => {
    if (!candidateId) return;
    setPromoting(true);
    try {
      await api.setBaseline(candidateId);
      await refreshBaseline();
      const name = runs.find((r) => r.id === candidateId)?.name ?? "run";
      flash(true, `Baseline manually set to "${name}" (advisory override).`);
    } catch (e) {
      flash(false, (e as Error).message);
    } finally {
      setPromoting(false);
    }
  };

  const handleCompare = async () => {
    if (!baselineId || !candidateId || baselineId === candidateId) {
      setError("Select two different runs.");
      return;
    }
    setComparing(true);
    setError(null);
    setIntelReport(undefined);
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

  const handleAnalyze = async () => {
    if (!baselineId || !candidateId) return;
    setAiLoading(true);
    try {
      const { report, provider, comparison: cmp } = await api.analyzeComparison(baselineId, candidateId);
      setComparison(cmp);
      setIntelReport(report);
      setAiProvider(provider);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <BaselineBanner baseline={baseline} />

      {toast && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "var(--radius)",
            fontSize: 13,
            fontFamily: "var(--mono)",
            color: toast.ok ? "var(--success)" : "var(--critical)",
            background: toast.ok ? "var(--success-bg)" : "var(--critical-bg)",
            border: `1px solid ${toast.ok ? "var(--success)" : "var(--critical)"}55`,
          }}
        >
          {toast.msg}
        </div>
      )}

      <CompareAllPanel
        result={allResult}
        loading={allLoading}
        error={allError}
        baselineRunId={baseline?.runId ?? null}
        promoting={promoting}
        disabled={runs.length < 2}
        onRun={handleCompareAll}
        onPromote={handlePromoteFrom}
      />

      <PortfolioReportPanel
        report={portfolio}
        loading={portfolioLoading}
        error={portfolioError}
        onGenerate={handleAnalyzePortfolio}
        onPromote={handlePromoteFrom}
        promoting={promoting}
        disabled={runs.length < 2}
      />

      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", fontFamily: "var(--mono)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 4 }}>
        Pairwise Comparison
      </div>

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
          <PromotionPanel
            comparison={comparison}
            baseline={baseline}
            promoting={promoting}
            onPromote={handlePromote}
            onForceSet={handleForceSetBaseline}
          />
          <DeltaTable deltas={comparison.deltas} />
          <DeltaBarChart deltas={comparison.deltas} />
          <IntelligenceReportPanel
            report={intelReport}
            provider={aiProvider}
            onGenerate={handleAnalyze}
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

function BaselineBanner({ baseline }: { baseline: BaselineState | null }) {
  return (
    <div
      style={{
        padding: "10px 16px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        fontSize: 13,
      }}
    >
      <span style={{ color: "var(--warning)", fontWeight: 700, fontFamily: "var(--mono)", fontSize: 12 }}>★ LOCKED BASELINE</span>
      {baseline ? (
        <>
          <span style={{ fontWeight: 600 }}>{baseline.name}</span>
          <span style={{ color: "var(--text-dim)", fontFamily: "var(--mono)", fontSize: 11 }}>
            locked {new Date(baseline.lockedAt).toLocaleString()}
          </span>
        </>
      ) : (
        <span style={{ color: "var(--text-dim)" }}>No baseline set yet — upload a run to seed one.</span>
      )}
    </div>
  );
}

function CompareAllPanel({
  result, loading, error, baselineRunId, promoting, disabled, onRun, onPromote,
}: {
  result: CompareAllResult | null;
  loading: boolean;
  error: string | null;
  baselineRunId: string | null;
  promoting: boolean;
  disabled: boolean;
  onRun: () => void;
  onPromote: (id: string) => void;
}) {
  const verdictColor = (v: ComparisonResult["overallVerdict"]) =>
    v === "improved" ? "var(--success)" : v === "regressed" ? "var(--critical)" : "var(--text-muted)";

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Compare All Runs vs Baseline
          </span>
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
            {result ? `Ranked ${result.comparisons.length} run${result.comparisons.length !== 1 ? "s" : ""} against "${result.baseline.name}".` : "Rank every run against the locked baseline."}
          </span>
        </div>
        <button
          onClick={onRun}
          disabled={loading || disabled}
          style={{
            marginLeft: "auto",
            padding: "7px 18px",
            background: loading || disabled ? "var(--surface-2)" : "var(--accent)",
            color: loading || disabled ? "var(--text-dim)" : "white",
            borderRadius: 4,
            fontWeight: 600,
            fontSize: 13,
            fontFamily: "var(--mono)",
            cursor: loading || disabled ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Comparing…" : "Compare all vs baseline"}
        </button>
      </div>

      {error && (
        <div style={{ padding: "8px 12px", background: "var(--critical-bg)", border: "1px solid var(--critical)", borderRadius: 4, color: "var(--critical)", fontSize: 12 }}>
          {error}
        </div>
      )}

      {result && result.comparisons.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--mono)", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Rank", "Run", "Verdict", "Overall Δ%", "Improved", "Regressions", ""].map((h) => (
                  <th key={h} style={{ padding: "7px 12px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.comparisons.map((c, i) => {
                const crit = c.regressions.filter((r) => r.severity === "critical").length;
                const warn = c.regressions.filter((r) => r.severity === "warning").length;
                const isBaseline = c.candidateId === baselineRunId;
                const canPromote = c.promotable && !isBaseline && !promoting;
                return (
                  <tr key={c.candidateId} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 12px", color: "var(--text-dim)" }}>{i + 1}</td>
                    <td style={{ padding: "8px 12px", fontWeight: 600, color: "var(--text)" }}>{c.candidateName}</td>
                    <td style={{ padding: "8px 12px", color: verdictColor(c.overallVerdict), fontWeight: 700 }}>
                      {c.overallVerdict.toUpperCase()}
                    </td>
                    <td style={{ padding: "8px 12px", color: verdictColor(c.overallVerdict), fontWeight: 600 }}>
                      {c.overallImprovementPct > 0 ? "+" : ""}{c.overallImprovementPct}%
                    </td>
                    <td style={{ padding: "8px 12px", color: "var(--text-muted)" }}>
                      {c.improvedCount}/{c.improvedCount + c.regressedCount}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      {c.regressions.length === 0 ? (
                        <span style={{ color: "var(--success)" }}>none</span>
                      ) : (
                        <span style={{ color: crit > 0 ? "var(--critical)" : "var(--warning)" }}>
                          {crit > 0 ? `${crit} crit` : ""}{crit > 0 && warn > 0 ? ", " : ""}{warn > 0 ? `${warn} warn` : ""}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                      {isBaseline ? (
                        <span style={{ color: "var(--warning)", fontSize: 10, fontWeight: 700 }}>★ BASELINE</span>
                      ) : (
                        <button
                          onClick={() => onPromote(c.candidateId)}
                          disabled={!canPromote}
                          title={c.promotable ? "Promote to baseline" : "Not eligible: regressed or no overall improvement."}
                          style={{
                            padding: "4px 12px",
                            borderRadius: 4,
                            fontFamily: "var(--mono)",
                            fontSize: 11,
                            fontWeight: 700,
                            background: canPromote ? "var(--success)" : "var(--surface-2)",
                            color: canPromote ? "white" : "var(--text-dim)",
                            cursor: canPromote ? "pointer" : "not-allowed",
                          }}
                        >
                          Promote
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PromotionPanel({
  comparison, baseline, promoting, onPromote, onForceSet,
}: {
  comparison: ComparisonResult;
  baseline: BaselineState | null;
  promoting: boolean;
  onPromote: () => void;
  onForceSet: () => void;
}) {
  const isBaselineCandidate = baseline?.runId === comparison.candidateId;
  const verdictColor =
    comparison.overallVerdict === "improved"
      ? "var(--success)"
      : comparison.overallVerdict === "regressed"
        ? "var(--critical)"
        : "var(--text-muted)";
  const canPromote = comparison.promotable && !isBaselineCandidate && !promoting;

  const promoteReason = isBaselineCandidate
    ? "Candidate is already the baseline."
    : comparison.regressedCount > 0 || comparison.regressions.length > 0
      ? "Blocked: candidate regressed on one or more metrics."
      : !comparison.promotable
        ? "Blocked: candidate did not improve overall."
        : "Eligible: no regressions and overall improvement.";

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: 16,
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--mono)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Overall vs Baseline
        </span>
        <span style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 18, color: verdictColor }}>
          {comparison.overallVerdict.toUpperCase()} ({comparison.overallImprovementPct > 0 ? "+" : ""}
          {comparison.overallImprovementPct}%)
        </span>
        <span style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--mono)" }}>
          {comparison.improvedCount} improved · {comparison.regressedCount} worse
        </span>
      </div>

      <span style={{ flex: 1, minWidth: 180, fontSize: 12, color: canPromote ? "var(--success)" : "var(--text-dim)" }}>
        {promoteReason}
      </span>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          onClick={onForceSet}
          disabled={promoting || isBaselineCandidate}
          title="Manually set this candidate as the baseline (advisory override)."
          style={{
            padding: "7px 14px",
            borderRadius: 4,
            fontFamily: "var(--mono)",
            fontSize: 12,
            fontWeight: 600,
            background: "var(--surface-2)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            cursor: promoting || isBaselineCandidate ? "not-allowed" : "pointer",
            opacity: promoting || isBaselineCandidate ? 0.5 : 1,
          }}
        >
          Force set as baseline
        </button>
        <button
          onClick={onPromote}
          disabled={!canPromote}
          title={promoteReason}
          style={{
            padding: "7px 18px",
            borderRadius: 4,
            fontFamily: "var(--mono)",
            fontSize: 13,
            fontWeight: 700,
            background: canPromote ? "var(--success)" : "var(--surface-2)",
            color: canPromote ? "white" : "var(--text-dim)",
            cursor: canPromote ? "pointer" : "not-allowed",
          }}
        >
          {promoting ? "Promoting…" : "Promote to baseline"}
        </button>
      </div>
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
