import { useEffect, useState } from "react";
import { api } from "./api.ts";
import { ComparePage } from "./pages/ComparePage.tsx";
import { RunDetailPage } from "./pages/RunDetailPage.tsx";
import { RunsPage } from "./pages/RunsPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { SummaryPage } from "./pages/SummaryPage.tsx";

type Tab = "runs" | "compare" | "settings" | "summary";

export default function App() {
  const [tab, setTab] = useState<Tab>("runs");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<string>("—");
  const [compareAllTrigger, setCompareAllTrigger] = useState(0);

  useEffect(() => {
    api.health().then((h) => setAiProvider(h.aiProvider)).catch(() => undefined);
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          gap: 24,
          height: 52,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16, letterSpacing: "-0.02em" }}>⬡</span>
          <span style={{ fontWeight: 700, fontSize: 14, fontFamily: "var(--mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Thermal Test Analyzer
          </span>
        </div>

        <nav style={{ display: "flex", gap: 2, marginLeft: "auto", alignItems: "center" }}>
          {(["runs", "compare", "settings", "summary"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t !== "runs") setSelectedRunId(null); }}
              style={{
                padding: "5px 14px",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "var(--mono)",
                color: tab === t ? "white" : "var(--text-muted)",
                background: tab === t ? "var(--accent)" : "transparent",
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </nav>

        <div style={{ fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--mono)", marginLeft: 8, whiteSpace: "nowrap" }}>
          AI: {aiProvider}
        </div>
      </header>

      <main style={{ flex: 1, padding: "24px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        {tab === "runs" && selectedRunId && (
          <RunDetailPage runId={selectedRunId} onBack={() => setSelectedRunId(null)} />
        )}
        {tab === "runs" && !selectedRunId && (
          <RunsPage
            onSelect={(id) => {
              setSelectedRunId(id);
            }}
            onBatchUploaded={(totalRuns) => {
              setSelectedRunId(null);
              // Only jump to Compare once there are at least two runs to compare;
              // otherwise stay on Runs so more reports can be added.
              if (totalRuns >= 2) {
                setTab("compare");
                setCompareAllTrigger((n) => n + 1);
              }
            }}
          />
        )}
        {tab === "compare" && <ComparePage compareAllTrigger={compareAllTrigger} />}
        {tab === "settings" && <SettingsPage onProviderChange={setAiProvider} />}
        {tab === "summary" && <SummaryPage />}
      </main>
    </div>
  );
}
