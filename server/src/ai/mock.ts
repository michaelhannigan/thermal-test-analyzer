import type { ComparisonResult, RunAnalysis } from "../types.js";
import type { AiProvider } from "./provider.js";

// Deterministic, offline summarizer. Produces a useful engineering narrative
// straight from the computed analysis, no API key required.
export class MockProvider implements AiProvider {
  name = "mock";

  async test(): Promise<void> {
    // Always available; no credentials required.
  }

  async summarizeRun(name: string, analysis: RunAnalysis): Promise<string> {
    const s = analysis.summary;
    const crit = analysis.anomalies.filter((a) => a.severity === "critical");
    const warn = analysis.anomalies.filter((a) => a.severity === "warning");

    const verdict =
      crit.length > 0
        ? "FAILED effectiveness criteria"
        : warn.length > 0
          ? "PASSED with reservations"
          : "PASSED nominally";

    const lines: string[] = [];
    lines.push(`Run "${name}" ${verdict}.`);
    lines.push(
      `Over ${s.totalFrames} frames (${s.durationS}s, ${s.uniqueTargets} target(s)), the system achieved a ` +
        `${(s.detectionRate * 100).toFixed(1)}% detection rate and ${(s.classificationRate * 100).toFixed(1)}% ` +
        `classification rate, with mean confidence ${s.meanConfidence.toFixed(2)}. ` +
        `Mean SNR was ${s.meanSnrDb} dB against mean thermal contrast of ${s.meanDeltaTC} C. ` +
        `Classification latency averaged ${s.meanLatencyMs} ms (p95 ${s.p95LatencyMs} ms). ` +
        `Peak sensor temperature reached ${s.maxSensorTempC} C.`,
    );

    if (analysis.anomalies.length === 0) {
      lines.push("No anomalies were detected; all metrics stayed within nominal bounds.");
    } else {
      lines.push("");
      lines.push("Key findings:");
      for (const a of [...crit, ...warn].slice(0, 6)) {
        lines.push(`- [${a.severity.toUpperCase()}] ${a.title}. ${a.description}`);
      }
    }

    lines.push("");
    lines.push("Recommended next steps:");
    const steps = new Set<string>();
    if (analysis.anomalies.some((a) => a.metric === "sensorTempC"))
      steps.add("Investigate sensor cooling/duty cycle; correlate detection drops with thermal soak.");
    if (analysis.anomalies.some((a) => a.metric === "snrDb" || a.metric === "netdMk"))
      steps.add("Review optics/gain calibration and the sensor noise floor for the affected segments.");
    if (analysis.anomalies.some((a) => a.metric === "detected"))
      steps.add("Triage the close-range false negatives against ground-truth annotations.");
    if (analysis.anomalies.some((a) => a.metric === "classificationLatencyMs"))
      steps.add("Profile the classifier for latency spikes under load.");
    if (analysis.anomalies.some((a) => a.metric === "droppedFrame"))
      steps.add("Inspect the capture pipeline for frame drops affecting tracking continuity.");
    if (steps.size === 0) steps.add("Promote this run as a baseline candidate for future regression comparisons.");
    for (const step of steps) lines.push(`- ${step}`);

    return lines.join("\n");
  }

  async summarizeComparison(c: ComparisonResult): Promise<string> {
    const crit = c.regressions.filter((r) => r.severity === "critical");
    const improvements = c.deltas
      .filter((d) => !d.isRegression && d.severity === "none" && isImprovement(d))
      .sort((a, b) => Math.abs(b.percentDelta) - Math.abs(a.percentDelta));

    const verdict =
      crit.length > 0
        ? "NO-GO: critical regression(s) detected"
        : c.regressions.length > 0
          ? "CONDITIONAL: minor regressions detected"
          : "GO: no regressions detected";

    const lines: string[] = [];
    lines.push(`Candidate "${c.candidateName}" vs baseline "${c.baselineName}" — ${verdict}.`);

    if (c.regressions.length > 0) {
      lines.push("");
      lines.push("Regressions:");
      for (const r of c.regressions.slice(0, 8)) {
        const dir = r.higherIsBetter ? "dropped" : "rose";
        lines.push(
          `- [${r.severity.toUpperCase()}] ${r.label} ${dir} from ${r.baseline}${r.unit} to ${r.candidate}${r.unit} ` +
            `(${r.percentDelta > 0 ? "+" : ""}${r.percentDelta}%).`,
        );
      }
    } else {
      lines.push("No metrics regressed beyond tolerance.");
    }

    if (improvements.length > 0) {
      lines.push("");
      lines.push("Notable improvements:");
      for (const d of improvements.slice(0, 4)) {
        lines.push(
          `- ${d.label}: ${d.baseline}${d.unit} -> ${d.candidate}${d.unit} (${d.percentDelta > 0 ? "+" : ""}${d.percentDelta}%).`,
        );
      }
    }

    lines.push("");
    lines.push(
      crit.length > 0
        ? "Recommendation: do not promote the candidate; root-cause the critical regressions before re-test."
        : c.regressions.length > 0
          ? "Recommendation: acceptable if regressions are understood and within mission tolerance; otherwise re-test."
          : "Recommendation: candidate is clear to promote over the baseline.",
    );

    return lines.join("\n");
  }
}

function isImprovement(d: { higherIsBetter: boolean; absoluteDelta: number }): boolean {
  return d.higherIsBetter ? d.absoluteDelta > 0 : d.absoluteDelta < 0;
}
