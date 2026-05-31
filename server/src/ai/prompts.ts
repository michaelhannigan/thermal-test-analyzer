import type { ComparisonResult, RunAnalysis } from "../types.js";

export const SYSTEM_PROMPT =
  "You are a senior test engineer analyzing thermal imaging effectiveness tests for an autonomous defense " +
  "sensor system. Write concise, technical summaries for engineers. Lead with the most operationally significant " +
  "findings. Be specific with numbers. Do not invent data beyond what is provided. Use short paragraphs and bullet points.";

export function runPromptUser(name: string, analysis: RunAnalysis): string {
  return [
    `Test run: ${name}`,
    "",
    "Summary metrics:",
    JSON.stringify(analysis.summary, null, 2),
    "",
    `Detected anomalies (${analysis.anomalies.length}):`,
    JSON.stringify(
      analysis.anomalies.map((a) => ({
        severity: a.severity,
        category: a.category,
        title: a.title,
        affectedCount: a.affectedCount,
        observedValue: a.observedValue,
        threshold: a.threshold,
      })),
      null,
      2,
    ),
    "",
    "Write a summary covering: overall effectiveness, the most important anomalies and their likely root causes, " +
      "and recommended next steps for the test team. Keep it under 250 words.",
  ].join("\n");
}

export function comparisonPromptUser(c: ComparisonResult): string {
  return [
    `Comparing CANDIDATE "${c.candidateName}" against BASELINE "${c.baselineName}".`,
    "",
    "All metric deltas (positive percentDelta = candidate higher than baseline):",
    JSON.stringify(c.deltas, null, 2),
    "",
    `Flagged regressions (${c.regressions.length}):`,
    JSON.stringify(c.regressions, null, 2),
    "",
    "Write a comparison summary: state whether the candidate run regressed, improved, or is neutral overall; " +
      "highlight the most significant regressions with their magnitudes; call out any notable improvements; " +
      "and give a clear go/no-go style recommendation. Keep it under 250 words.",
  ].join("\n");
}
