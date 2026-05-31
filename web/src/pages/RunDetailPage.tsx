import { useEffect, useState } from "react";
import { api, type RunDetail } from "../api.ts";
import { AiSummaryPanel } from "../components/AiSummaryPanel.tsx";
import { AnomalyList } from "../components/AnomalyList.tsx";
import { MetricGrid } from "../components/MetricGrid.tsx";
import { TimeSeriesCharts } from "../components/TimeSeriesCharts.tsx";

interface Props {
  runId: string;
  onBack: () => void;
}

export function RunDetailPage({ runId, onBack }: Props) {
  const [run, setRun] = useState<RunDetail | null>(null);
  const [aiProvider, setAiProvider] = useState<string | undefined>();
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getRun(runId)
      .then(setRun)
      .catch((e: Error) => setError(e.message));
  }, [runId]);

  const handleGenerateSummary = async () => {
    if (!run) return;
    setAiLoading(true);
    try {
      const { summary, provider } = await api.summarizeRun(run.id);
      setAiProvider(provider);
      setRun((prev) => (prev ? { ...prev, aiSummary: summary } : prev));
    } finally {
      setAiLoading(false);
    }
  };

  if (error) return (
    <div style={{ color: "var(--critical)", padding: 20 }}>{error}</div>
  );

  if (!run) return (
    <div style={{ color: "var(--text-dim)", padding: 20, fontFamily: "var(--mono)", fontSize: 13 }}>Loading run…</div>
  );

  const crit = run.analysis.anomalies.filter((a) => a.severity === "critical").length;
  const warn = run.analysis.anomalies.filter((a) => a.severity === "warning").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onBack}
          style={{ color: "var(--text-muted)", fontSize: 13, fontFamily: "var(--mono)", padding: "4px 10px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4 }}
        >
          ← Back
        </button>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{run.name}</h2>
          <div style={{ fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--mono)", marginTop: 2 }}>
            {run.analysis.summary.totalFrames} frames · {run.analysis.summary.durationS}s
            {crit > 0 && <span style={{ color: "var(--critical)", marginLeft: 8 }}>{crit} critical</span>}
            {warn > 0 && <span style={{ color: "var(--warning)", marginLeft: 8 }}>{warn} warning</span>}
          </div>
        </div>
      </div>

      <Section title="Summary Metrics">
        <MetricGrid summary={run.analysis.summary} />
      </Section>

      <Section title={`Anomalies (${run.analysis.anomalies.length})`}>
        <AnomalyList anomalies={run.analysis.anomalies} />
      </Section>

      <Section title="Time Series">
        <TimeSeriesCharts data={run.analysis.timeSeries} />
      </Section>

      <AiSummaryPanel
        summary={run.aiSummary}
        provider={aiProvider}
        onGenerate={handleGenerateSummary}
        loading={aiLoading}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", fontFamily: "var(--mono)", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {title}
      </div>
      {children}
    </div>
  );
}
