import type { IntelVerdict } from "../api.ts";

export function verdictColor(v: IntelVerdict): string {
  return v === "GO" ? "var(--success)" : v === "CONDITIONAL" ? "var(--warning)" : "var(--critical)";
}

export const PRIORITY_COLOR: Record<string, string> = {
  P0: "var(--critical)",
  P1: "var(--warning)",
  P2: "var(--text-dim)",
};
