import { useEffect, useState } from "react";
import { api, type BaselineState, type RunSummaryItem } from "../api.ts";
import { SeverityBadge } from "../components/Badge.tsx";
import { UploadZone } from "../components/UploadZone.tsx";

interface Props {
  onSelect: (id: string) => void;
  onBatchUploaded: (totalRuns: number) => void;
}

export function RunsPage({ onSelect, onBatchUploaded }: Props) {
  const [runs, setRuns] = useState<RunSummaryItem[]>([]);
  const [baseline, setBaseline] = useState<BaselineState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileErrors, setFileErrors] = useState<Array<{ name: string; error: string }>>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () =>
    Promise.all([api.listRuns(), api.getBaseline()])
      .then(([rs, bl]) => {
        setRuns(rs);
        setBaseline(bl);
        return rs;
      })
      .catch(() => undefined);

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, []);

  const handleSetBaseline = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await api.setBaseline(id).catch(() => undefined);
    await refresh();
  };

  const handleFiles = async (files: File[]) => {
    setUploading(true);
    setError(null);
    setFileErrors([]);
    try {
      const result = await api.uploadCsvBatch(files);
      setFileErrors(result.errors);
      const rs = await refresh();
      if (result.created.length > 0) onBatchUploaded(rs?.length ?? result.created.length);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await api.deleteRun(id);
    await refresh();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <UploadZone onFiles={handleFiles} uploading={uploading} />
      {error && (
        <div style={{ padding: "10px 14px", background: "var(--critical-bg)", border: "1px solid var(--critical)", borderRadius: "var(--radius)", color: "var(--critical)", fontSize: 13 }}>
          {error}
        </div>
      )}
      {fileErrors.length > 0 && (
        <div style={{ padding: "10px 14px", background: "var(--critical-bg)", border: "1px solid var(--critical)", borderRadius: "var(--radius)", color: "var(--critical)", fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Some files could not be imported:</div>
          {fileErrors.map((fe) => (
            <div key={fe.name} style={{ fontFamily: "var(--mono)", fontSize: 12 }}>
              {fe.name}: {fe.error}
            </div>
          ))}
        </div>
      )}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", fontFamily: "var(--mono)", marginBottom: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Test Runs ({runs.length})
        </div>
        {loading ? (
          <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Loading…</div>
        ) : runs.length === 0 ? (
          <div style={{ color: "var(--text-dim)", fontSize: 13 }}>No runs yet. Upload a CSV to get started.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1, borderRadius: "var(--radius)", overflow: "hidden", border: "1px solid var(--border)" }}>
            {runs.map((run) => (
              <div
                key={run.id}
                onClick={() => onSelect(run.id)}
                style={{
                  background: "var(--surface)",
                  padding: "12px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {run.name}
                    </span>
                    {baseline?.runId === run.id && (
                      <span
                        title={`Locked baseline since ${new Date(baseline.lockedAt).toLocaleString()}`}
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          fontFamily: "var(--mono)",
                          color: "var(--warning)",
                          border: "1px solid var(--warning)",
                          borderRadius: 3,
                          padding: "1px 6px",
                          letterSpacing: "0.05em",
                        }}
                      >
                        ★ BASELINE
                      </span>
                    )}
                    {run.criticalCount > 0 && <SeverityBadge severity="critical" />}
                    {run.criticalCount === 0 && run.anomalyCount > 0 && <SeverityBadge severity="warning" />}
                    {run.anomalyCount === 0 && <SeverityBadge severity="none" />}
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 4, fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--mono)", flexWrap: "wrap" }}>
                    <span>{run.summary.totalFrames} frames</span>
                    <span>{run.summary.durationS}s</span>
                    <span>DR: {(run.summary.detectionRate * 100).toFixed(1)}%</span>
                    <span>SNR: {run.summary.meanSnrDb} dB</span>
                    <span>{run.anomalyCount} anomaly{run.anomalyCount !== 1 ? "ies" : ""}</span>
                    <span style={{ color: "var(--text-dim)" }}>{new Date(run.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
                {baseline?.runId !== run.id && (
                  <button
                    onClick={(e) => handleSetBaseline(e, run.id)}
                    title="Set as baseline (advisory override)"
                    style={{
                      color: "var(--text-dim)",
                      fontSize: 11,
                      fontFamily: "var(--mono)",
                      padding: "4px 8px",
                      borderRadius: 4,
                      border: "1px solid var(--border)",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--warning)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
                  >
                    set baseline
                  </button>
                )}
                <button
                  onClick={(e) => handleDelete(e, run.id)}
                  title="Delete run"
                  style={{
                    color: "var(--text-dim)",
                    fontSize: 16,
                    padding: "4px 8px",
                    borderRadius: 4,
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--critical)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
