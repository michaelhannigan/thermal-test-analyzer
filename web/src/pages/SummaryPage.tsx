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
import {
  BUILD_STATS,
  ORCHESTRATION_LOOP,
  SDLC_PHASES,
  TECH_STACK,
  TOOL_USAGE,
  type SdlcPhase,
} from "../data/sdlc.ts";

const PHASE_COLORS: Record<string, string> = {
  Discovery: "#3b82f6",
  Planning: "#8b5cf6",
  Architecture: "#06b6d4",
  Implementation: "#10b981",
  "Test Data": "#f59e0b",
  Verification: "#ec4899",
  Iteration: "#f97316",
};

export function SummaryPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <Intro />
      <StatsRow />
      <OrchestrationLoop />
      <Section title="SDLC Timeline — How Factory Orchestrated the Build">
        <Timeline />
      </Section>
      <Section title="Tool Orchestration Profile">
        <ToolChart />
      </Section>
      <TechStack />
    </div>
  );
}

function Intro() {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: 24,
      }}
    >
      <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--accent)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
        Built with Factory · Droid Agent
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10, letterSpacing: "-0.02em" }}>
        End-to-End SDLC, Orchestrated by Factory
      </h1>
      <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 760 }}>
        This entire application — backend analytics engine, pluggable AI layer, sample data, and React dashboard —
        was designed, implemented, and verified by Factory's autonomous coding agent. Factory ran the full software
        development lifecycle as a closed agentic loop: it captured requirements directly from you, planned the work,
        wrote and edited every file, generated test fixtures, and gated each change behind typechecks, builds, and
        live integration tests — iterating safely as you requested new features.
      </p>
    </div>
  );
}

function StatsRow() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 1, background: "var(--border)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden" }}>
      {BUILD_STATS.map((s) => (
        <div key={s.label} style={{ background: "var(--surface)", padding: "16px 14px", textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--mono)", color: "var(--text)" }}>{s.value}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, letterSpacing: "0.03em" }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function OrchestrationLoop() {
  return (
    <Section title="Factory's Agentic Loop">
      <div style={{ display: "flex", alignItems: "stretch", gap: 0, flexWrap: "wrap" }}>
        {ORCHESTRATION_LOOP.map((step, i) => (
          <div key={step.label} style={{ display: "flex", alignItems: "center", flex: "1 1 160px", minWidth: 0 }}>
            <div
              style={{
                flex: 1,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "14px 12px",
                textAlign: "center",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  color: "white",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--mono)",
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 8,
                }}
              >
                {i + 1}
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, fontFamily: "var(--mono)" }}>{step.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4, lineHeight: 1.4 }}>{step.detail}</div>
            </div>
            {i < ORCHESTRATION_LOOP.length - 1 && (
              <div style={{ color: "var(--text-dim)", padding: "0 6px", fontSize: 18, flexShrink: 0 }}>→</div>
            )}
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--mono)" }}>
        ↺ repeated each cycle, with verification before moving on
      </div>
    </Section>
  );
}

function Timeline() {
  return (
    <div style={{ position: "relative", paddingLeft: 28 }}>
      <div style={{ position: "absolute", left: 9, top: 6, bottom: 6, width: 2, background: "var(--border)" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {SDLC_PHASES.map((p) => (
          <PhaseCard key={p.id} phase={p} />
        ))}
      </div>
    </div>
  );
}

function PhaseCard({ phase }: { phase: SdlcPhase }) {
  const color = PHASE_COLORS[phase.phase] ?? "var(--accent)";
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "absolute",
          left: -27,
          top: 14,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: color,
          border: "3px solid var(--bg)",
          boxShadow: `0 0 0 1px ${color}`,
        }}
      />
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16, borderLeft: `3px solid ${color}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontFamily: "var(--mono)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color, padding: "2px 8px", background: `${color}1a`, borderRadius: 3 }}>
            {phase.phase}
          </span>
          <span style={{ fontSize: 15, fontWeight: 700 }}>{phase.title}</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 10 }}>{phase.factoryRole}</p>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {phase.tools.map((t) => (
            <span key={t} style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--accent-hover)", padding: "2px 8px", background: "rgba(59,130,246,.1)", border: "1px solid rgba(59,130,246,.25)", borderRadius: 3 }}>
              {t}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
          {phase.artifacts.map((a) => (
            <div key={a} style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--text-dim)", display: "flex", gap: 6 }}>
              <span style={{ color }}>▸</span>
              <span>{a}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 12, color: "var(--success)", fontWeight: 500, display: "flex", gap: 6, alignItems: "baseline" }}>
          <span style={{ fontFamily: "var(--mono)" }}>✓</span>
          <span>{phase.outcome}</span>
        </div>
      </div>
    </div>
  );
}

function ToolChart() {
  const data = TOOL_USAGE.map((t) => ({ name: t.tool, uses: t.uses, purpose: t.purpose }));
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "16px 8px 8px" }}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ left: 20, right: 50, top: 4, bottom: 4 }}>
          <CartesianGrid stroke="var(--border)" horizontal={false} />
          <XAxis type="number" tick={{ fill: "var(--text-dim)", fontSize: 10, fontFamily: "var(--mono)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 12, fontFamily: "var(--mono)" }} axisLine={false} tickLine={false} width={90} />
          <Tooltip
            contentStyle={{ background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: 4, fontSize: 11, fontFamily: "var(--mono)", color: "var(--text)" }}
            formatter={(v: number, _n: string, item: { payload?: { purpose?: string } }) => [`${v} uses — ${item?.payload?.purpose ?? ""}`, "Tool"]}
          />
          <Bar dataKey="uses" isAnimationActive={false} radius={[0, 3, 3, 0]}>
            <LabelList dataKey="uses" position="right" style={{ fill: "var(--text-muted)", fontSize: 11, fontFamily: "var(--mono)" }} />
            {data.map((_, i) => (
              <Cell key={i} fill={["#3b82f6", "#10b981", "#8b5cf6", "#06b6d4", "#f59e0b", "#ec4899"][i % 6]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TechStack() {
  return (
    <Section title="Stack Selected & Wired by Factory">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {TECH_STACK.map((t) => (
          <span key={t} style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--text-muted)", padding: "5px 12px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20 }}>
            {t}
          </span>
        ))}
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", fontFamily: "var(--mono)", marginBottom: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {title}
      </div>
      {children}
    </div>
  );
}
