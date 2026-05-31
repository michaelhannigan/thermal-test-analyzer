import { useState } from "react";

interface Props {
  summary?: string;
  provider?: string;
  onGenerate: () => Promise<void>;
  loading?: boolean;
}

export function AiSummaryPanel({ summary, provider, onGenerate, loading }: Props) {
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setError(null);
    try {
      await onGenerate();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--mono)", color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          AI Analysis
          {provider && (
            <span style={{ marginLeft: 8, color: "var(--text-dim)", fontWeight: 400 }}>
              [{provider}]
            </span>
          )}
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
            transition: "background 0.15s",
          }}
        >
          {loading ? "Generating…" : summary ? "Regenerate" : "Generate Summary"}
        </button>
      </div>
      <div style={{ padding: 16 }}>
        {error && (
          <div style={{ color: "var(--critical)", fontSize: 12, marginBottom: 8 }}>{error}</div>
        )}
        {summary ? (
          <pre
            style={{
              fontFamily: "var(--mono)",
              fontSize: 12,
              lineHeight: 1.7,
              color: "var(--text-muted)",
              whiteSpace: "pre-wrap",
              margin: 0,
            }}
          >
            {summary}
          </pre>
        ) : (
          <p style={{ color: "var(--text-dim)", fontSize: 12 }}>
            Click "Generate Summary" to produce an AI-powered anomaly narrative for this run.
          </p>
        )}
      </div>
    </div>
  );
}
