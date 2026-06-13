import type { ComparisonResult, IntelligenceReport, PortfolioReport, RunAnalysis } from "../types.js";

export const SYSTEM_PROMPT =
  "You are a Simulation Regression Intelligence Agent for an autonomous defense thermal-imaging sensor system. " +
  "You transform raw telemetry and computed deltas into actionable engineering conclusions: you identify the " +
  "meaningful behavioral changes, generate ranked root-cause hypotheses with explicit evidence and a calibrated " +
  "confidence, and recommend concrete, prioritized validation steps. You are rigorous and never invent numbers " +
  "beyond what is provided. You ALWAYS respond with a single JSON object and nothing else.";

const SCHEMA = `Return ONLY a JSON object with exactly this shape (no markdown, no prose outside JSON):
{
  "verdict": "GO" | "CONDITIONAL" | "NO-GO",
  "headline": string,                       // one sentence, the actionable conclusion
  "behavioralChanges": [
    { "metric": string, "label": string, "summary": string,
      "conclusion": string,                 // 2-4 sentences: implication + cross-metric impact + "Recommended action: ..."
      "direction": "improved" | "regressed" | "neutral",
      "severity": "critical" | "warning" | "info" | "none", "magnitudePct": number }
  ],
  "rootCauseHypotheses": [
    { "title": string, "detail": string, "confidence": "high" | "medium" | "low",
      "evidence": string[], "relatedMetrics": string[] }
  ],
  "validationSteps": [
    { "action": string, "rationale": string, "priority": "P0" | "P1" | "P2" }
  ],
  "confidence": "high" | "medium" | "low"
}
Rules: keep "verdict" and the numeric facts in "behavioralChanges" consistent with the provided draft and deltas; do
not fabricate metrics. You may sharpen wording, merge or re-rank hypotheses, and improve the validation steps. For each
behavioral change, write a "conclusion" that interprets the shift, notes any cross-metric impact, and ends with a
concrete "Recommended action: ..." sentence.`;

export function runPromptUser(name: string, analysis: RunAnalysis, draft: IntelligenceReport): string {
  return [
    `Single test run: "${name}".`,
    "",
    "Summary metrics:",
    JSON.stringify(analysis.summary, null, 2),
    "",
    `Detected anomalies (${analysis.anomalies.length}):`,
    JSON.stringify(
      analysis.anomalies.map((a) => ({
        severity: a.severity,
        category: a.category,
        metric: a.metric,
        title: a.title,
        affectedCount: a.affectedCount,
        observedValue: a.observedValue,
        threshold: a.threshold,
      })),
      null,
      2,
    ),
    "",
    "A deterministic draft report (your grounding — refine it, stay consistent with its facts):",
    JSON.stringify(draftForPrompt(draft), null, 2),
    "",
    SCHEMA,
  ].join("\n");
}

export function comparisonPromptUser(c: ComparisonResult, draft: IntelligenceReport): string {
  return [
    `Comparing CANDIDATE "${c.candidateName}" against BASELINE "${c.baselineName}".`,
    `Overall improvement: ${c.overallImprovementPct}% (${c.improvedCount} improved, ${c.regressedCount} worse). Promotable: ${c.promotable}.`,
    "",
    "All metric deltas (positive percentDelta = candidate higher than baseline):",
    JSON.stringify(c.deltas, null, 2),
    "",
    `Flagged regressions (${c.regressions.length}):`,
    JSON.stringify(c.regressions, null, 2),
    "",
    "A deterministic draft report (your grounding — refine it, stay consistent with its facts):",
    JSON.stringify(draftForPrompt(draft), null, 2),
    "",
    SCHEMA,
  ].join("\n");
}

const PORTFOLIO_SCHEMA = `Return ONLY a JSON object with exactly this shape (no markdown, no prose outside JSON):
{
  "headline": string,                       // one sentence portfolio-level conclusion
  "commonFailureModes": [
    { "mode": string, "affectedRuns": string[], "confidence": "high" | "medium" | "low" }
  ],
  "validationSteps": [
    { "action": string, "rationale": string, "priority": "P0" | "P1" | "P2" }
  ]
}
Rules: keep the ranking, promotable set, recommended baseline, and verdict from the draft (those are computed
facts); do not invent run names or numbers. You may sharpen the narrative, merge/re-rank failure modes, and improve
the recommended actions.`;

export function portfolioPromptUser(draft: PortfolioReport): string {
  return [
    `Portfolio review of ${draft.runCount} run(s) against baseline "${draft.baselineName}".`,
    `Computed verdict: ${draft.verdict}. Promotable: [${draft.promotable.join(", ") || "none"}]. Recommended baseline: ${draft.recommendedBaseline ?? "none"}.`,
    "",
    "Ranked runs (facts — do not change):",
    JSON.stringify(draft.ranked, null, 2),
    "",
    "A deterministic draft report (your grounding — refine its narrative, stay consistent with its facts):",
    JSON.stringify(
      { headline: draft.headline, commonFailureModes: draft.commonFailureModes, validationSteps: draft.validationSteps },
      null,
      2,
    ),
    "",
    PORTFOLIO_SCHEMA,
  ].join("\n");
}

export function parsePortfolioReport(text: string, draft: PortfolioReport): PortfolioReport {
  const obj = JSON.parse(extractJson(text)) as Record<string, unknown>;

  const headline = typeof obj.headline === "string" && obj.headline.trim() ? obj.headline.trim() : draft.headline;

  const commonFailureModes = Array.isArray(obj.commonFailureModes)
    ? (obj.commonFailureModes as Record<string, unknown>[])
        .filter((m) => typeof m?.mode === "string")
        .map((m) => ({
          mode: String(m.mode),
          affectedRuns: Array.isArray(m.affectedRuns) ? m.affectedRuns.map(String) : [],
          confidence: CONFIDENCES.has(m.confidence as string) ? (m.confidence as PortfolioReport["commonFailureModes"][number]["confidence"]) : "medium",
        }))
    : draft.commonFailureModes;

  const validationSteps = Array.isArray(obj.validationSteps)
    ? (obj.validationSteps as Record<string, unknown>[])
        .filter((v) => typeof v?.action === "string")
        .map((v) => ({
          action: String(v.action),
          rationale: String(v.rationale ?? ""),
          priority: PRIORITIES.has(v.priority as string) ? (v.priority as ValidationPriority) : "P1",
        }))
    : draft.validationSteps;

  return {
    ...draft,
    headline,
    commonFailureModes: commonFailureModes.length > 0 ? commonFailureModes : draft.commonFailureModes,
    validationSteps: validationSteps.length > 0 ? validationSteps : draft.validationSteps,
  };
}

function draftForPrompt(draft: IntelligenceReport) {
  return {
    verdict: draft.verdict,
    headline: draft.headline,
    behavioralChanges: draft.behavioralChanges,
    rootCauseHypotheses: draft.rootCauseHypotheses,
    validationSteps: draft.validationSteps,
    confidence: draft.confidence,
  };
}

const CONFIDENCES = new Set(["high", "medium", "low"]);
const VERDICTS = new Set(["GO", "CONDITIONAL", "NO-GO"]);
const PRIORITIES = new Set(["P0", "P1", "P2"]);
const DIRECTIONS = new Set(["improved", "regressed", "neutral"]);
const SEVERITIES = new Set(["critical", "warning", "info", "none"]);

// Parse a model response into an IntelligenceReport, merging onto the deterministic
// draft so any missing/invalid field falls back to the grounded value. Throws if the
// response is not usable JSON.
export function parseReport(text: string, draft: IntelligenceReport): IntelligenceReport {
  const json = extractJson(text);
  const obj = JSON.parse(json) as Record<string, unknown>;

  const verdict = VERDICTS.has(obj.verdict as string) ? (obj.verdict as IntelligenceReport["verdict"]) : draft.verdict;
  const confidence = CONFIDENCES.has(obj.confidence as string)
    ? (obj.confidence as IntelligenceReport["confidence"])
    : draft.confidence;
  const headline = typeof obj.headline === "string" && obj.headline.trim() ? obj.headline.trim() : draft.headline;

  const draftConclusionByMetric = new Map(draft.behavioralChanges.map((b) => [b.metric, b.conclusion]));
  const behavioralChanges = Array.isArray(obj.behavioralChanges)
    ? (obj.behavioralChanges as Record<string, unknown>[])
        .filter((b) => typeof b?.label === "string" && typeof b?.summary === "string")
        .map((b) => {
          const metric = String(b.metric ?? "");
          const conclusion =
            typeof b.conclusion === "string" && b.conclusion.trim()
              ? b.conclusion.trim()
              : (draftConclusionByMetric.get(metric) ?? "");
          return {
            metric,
            label: String(b.label),
            summary: String(b.summary),
            conclusion,
            direction: DIRECTIONS.has(b.direction as string) ? (b.direction as "improved" | "regressed" | "neutral") : "neutral",
            severity: SEVERITIES.has(b.severity as string) ? (b.severity as IntelligenceReport["behavioralChanges"][number]["severity"]) : "none",
            magnitudePct: Number.isFinite(Number(b.magnitudePct)) ? Number(b.magnitudePct) : 0,
          };
        })
    : draft.behavioralChanges;

  const rootCauseHypotheses = Array.isArray(obj.rootCauseHypotheses)
    ? (obj.rootCauseHypotheses as Record<string, unknown>[])
        .filter((h) => typeof h?.title === "string")
        .map((h) => ({
          title: String(h.title),
          detail: String(h.detail ?? ""),
          confidence: CONFIDENCES.has(h.confidence as string) ? (h.confidence as IntelligenceReport["confidence"]) : "medium",
          evidence: Array.isArray(h.evidence) ? h.evidence.map(String) : [],
          relatedMetrics: Array.isArray(h.relatedMetrics) ? h.relatedMetrics.map(String) : [],
        }))
    : draft.rootCauseHypotheses;

  const validationSteps = Array.isArray(obj.validationSteps)
    ? (obj.validationSteps as Record<string, unknown>[])
        .filter((v) => typeof v?.action === "string")
        .map((v) => ({
          action: String(v.action),
          rationale: String(v.rationale ?? ""),
          priority: PRIORITIES.has(v.priority as string) ? (v.priority as ValidationPriority) : "P1",
        }))
    : draft.validationSteps;

  return {
    ...draft,
    verdict,
    headline,
    behavioralChanges,
    rootCauseHypotheses: rootCauseHypotheses.length > 0 ? rootCauseHypotheses : draft.rootCauseHypotheses,
    validationSteps: validationSteps.length > 0 ? validationSteps : draft.validationSteps,
    confidence,
  };
}

type ValidationPriority = "P0" | "P1" | "P2";

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("No JSON object found in model response.");
  return body.slice(start, end + 1);
}
