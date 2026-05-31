import type { AnomalySeverity } from "../api.ts";

const CONFIG: Record<AnomalySeverity | "none", { label: string; color: string; bg: string }> = {
  critical: { label: "CRITICAL", color: "var(--critical)", bg: "var(--critical-bg)" },
  warning: { label: "WARNING", color: "var(--warning)", bg: "var(--warning-bg)" },
  info: { label: "INFO", color: "var(--info)", bg: "var(--info-bg)" },
  none: { label: "OK", color: "var(--success)", bg: "var(--success-bg)" },
};

export function SeverityBadge({ severity }: { severity: AnomalySeverity | "none" }) {
  const cfg = CONFIG[severity];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "1px 7px",
        borderRadius: 3,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "var(--mono)",
        letterSpacing: "0.05em",
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.color}33`,
        whiteSpace: "nowrap",
      }}
    >
      {cfg.label}
    </span>
  );
}
