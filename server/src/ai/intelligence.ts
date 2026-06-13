import type {
  Anomaly,
  AnomalySeverity,
  BehavioralChange,
  ComparisonResult,
  Confidence,
  IntelVerdict,
  IntelligenceReport,
  MetricDelta,
  PortfolioReport,
  PortfolioRunEntry,
  RootCauseHypothesis,
  RunAnalysis,
  ValidationStep,
} from "../types.js";

// Deterministic "intelligence core". It turns computed deltas/anomalies into
// behavioral changes, ranked root-cause hypotheses, and validation steps. The
// mock provider returns this verbatim; live LLM providers refine its narrative
// while staying grounded in the same evidence.

const SEV_RANK: Record<AnomalySeverity | "none", number> = { critical: 0, warning: 1, info: 2, none: 3 };
const NOISE_FLOOR_PCT = 3; // ignore improvements smaller than this as noise

// Canonical remediation actions keyed by failure mode.
const VALIDATION: Record<string, { action: string; rationale: string }> = {
  soak: {
    action: "Inspect sensor cooling/duty-cycle and correlate detection loss against the thermal-soak ramp.",
    rationale: "Rising core temperature raises the noise floor and degrades detection over the run.",
  },
  noiseFloor: {
    action: "Re-run the NETD noise-floor calibration and inspect optics for contamination or defocus.",
    rationale: "An elevated noise floor not explained by thermal soak points to sensor/optics drift.",
  },
  detection: {
    action: "Replay the affected segments against ground-truth annotations to confirm false negatives.",
    rationale: "Confirms whether detection loss is real and isolates the SNR/contrast threshold.",
  },
  contrast: {
    action: "Verify environmental conditions and target emissivity/range profile match the baseline test card.",
    rationale: "Reduced thermal contrast is often environmental rather than a system regression.",
  },
  latency: {
    action: "Profile the classifier under load and check for thermal throttling and compute contention.",
    rationale: "Latency spikes indicate the classifier is resource-starved or throttling.",
  },
  drops: {
    action: "Inspect capture-pipeline buffers and bandwidth around the dropped-frame bursts.",
    rationale: "Frame drops reduce effective frame rate and break tracking continuity.",
  },
  tracking: {
    action: "Audit tracker continuity across dropped frames and detection gaps.",
    rationale: "Tracking error is frequently secondary to drops or missed detections.",
  },
};

function confidenceFrom(severities: (AnomalySeverity | "none")[]): Confidence {
  if (severities.includes("critical")) return "high";
  const warns = severities.filter((s) => s === "warning").length;
  if (warns >= 2) return "high";
  if (warns === 1) return "medium";
  return "low";
}

// Per-metric domain knowledge used to turn a raw delta into an engineering conclusion.
interface MetricNarrative {
  improved: string; // implication when the metric moved in the better direction
  regressed: string; // implication when it moved in the worse direction
  related: string[]; // related metric keys to check for corroborating/adverse impact
  relatedLabel: string; // human group name, e.g. "latency or detection performance"
  monitor: string; // what to keep watching, e.g. "dropped-frame metrics"
}

const SCENARIO = "longer-duration and peak-load simulation scenarios";

const GENERIC_NARRATIVE: MetricNarrative = {
  improved: "The change moves this metric in the desired direction.",
  regressed: "The change moves this metric in an undesired direction.",
  related: [],
  relatedLabel: "related metrics",
  monitor: "this metric",
};

const METRIC_NARRATIVE: Record<string, MetricNarrative> = {
  detectionRate: {
    improved: "The system is catching more valid targets, directly improving operational effectiveness.",
    regressed: "More valid targets are being missed, a direct hit to mission effectiveness.",
    related: ["meanSnrDb", "meanDeltaTC", "meanConfidence"],
    relatedLabel: "signal quality (SNR and contrast)",
    monitor: "detection rate",
  },
  classificationRate: {
    improved: "More targets are being correctly classified, strengthening downstream decisioning.",
    regressed: "Fewer targets are being classified, weakening downstream decisioning.",
    related: ["detectionRate", "meanConfidence", "meanSnrDb"],
    relatedLabel: "detection rate and confidence",
    monitor: "classification rate",
  },
  meanConfidence: {
    improved: "Higher mean confidence reflects cleaner detections and a healthier signal chain.",
    regressed: "Lower mean confidence suggests the detector is operating closer to its decision threshold.",
    related: ["meanSnrDb", "detectionRate"],
    relatedLabel: "SNR and detection rate",
    monitor: "detection confidence",
  },
  meanSnrDb: {
    improved: "Improved SNR widens the detection margin and should harden performance in marginal conditions.",
    regressed: "Reduced SNR shrinks the detection margin and makes the system more fragile in marginal conditions.",
    related: ["meanNetdMk", "maxSensorTempC", "detectionRate"],
    relatedLabel: "noise floor and sensor temperature",
    monitor: "SNR",
  },
  meanDeltaTC: {
    improved: "Greater thermal contrast improves target separability from the background.",
    regressed: "Reduced thermal contrast lowers target separability and can stem from environment or emissivity changes.",
    related: ["detectionRate", "meanSnrDb"],
    relatedLabel: "detection performance",
    monitor: "thermal contrast",
  },
  meanNetdMk: {
    improved: "A lower noise floor (NETD) improves sensitivity and detection reliability.",
    regressed: "An elevated noise floor (NETD) degrades sensitivity and is often a precursor to detection loss.",
    related: ["maxSensorTempC", "meanSnrDb"],
    relatedLabel: "sensor temperature and SNR",
    monitor: "the sensor noise floor (NETD)",
  },
  meanLatencyMs: {
    improved: "Lower mean latency improves the real-time responsiveness of the classification path.",
    regressed: "Higher mean latency erodes real-time responsiveness and may indicate compute contention or throttling.",
    related: ["p95LatencyMs", "maxSensorTempC"],
    relatedLabel: "tail latency and sensor temperature",
    monitor: "classification latency",
  },
  p95LatencyMs: {
    improved: "Lower tail latency means fewer worst-case stalls under load.",
    regressed: "Higher tail latency means more worst-case stalls under load.",
    related: ["meanLatencyMs", "maxSensorTempC"],
    relatedLabel: "mean latency and sensor temperature",
    monitor: "tail (p95) latency",
  },
  meanTrackErrorM: {
    improved: "Reduced tracking error improves track continuity and fire-control quality.",
    regressed: "Increased tracking error degrades track continuity, often secondary to drops or detection gaps.",
    related: ["droppedFrameRate", "detectionRate"],
    relatedLabel: "frame drops and detection",
    monitor: "tracking error",
  },
  droppedFrameRate: {
    improved: "The improvement suggests recent changes to the processing pipeline successfully reduced frame loss under load.",
    regressed: "The capture/imaging pipeline is shedding more frames under load, which can break tracking continuity.",
    related: ["meanLatencyMs", "p95LatencyMs", "detectionRate", "classificationRate"],
    relatedLabel: "latency or detection performance",
    monitor: "dropped-frame metrics",
  },
  maxSensorTempC: {
    improved: "Lower peak sensor temperature reduces thermal-soak risk to the noise floor.",
    regressed: "Higher peak sensor temperature raises thermal-soak risk, lifting the noise floor and threatening detection.",
    related: ["meanNetdMk", "meanSnrDb", "meanLatencyMs"],
    relatedLabel: "noise floor, SNR, and latency",
    monitor: "peak sensor temperature",
  },
  meanFrameRateHz: {
    improved: "Higher effective frame rate improves temporal coverage and tracking continuity.",
    regressed: "Lower effective frame rate reduces temporal coverage and can degrade tracking.",
    related: ["droppedFrameRate", "meanTrackErrorM"],
    relatedLabel: "frame drops and tracking",
    monitor: "effective frame rate",
  },
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function joinLabels(deltas: MetricDelta[]): string {
  const labels = deltas.map((x) => x.label);
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function deltaSummary(d: MetricDelta): string {
  const verb = d.absoluteDelta >= 0 ? "increased" : "decreased";
  return `${d.label} ${verb} by ${Math.abs(d.percentDelta)}% (${d.baseline}${d.unit} → ${d.candidate}${d.unit})`;
}

function crossImpact(improved: boolean, n: MetricNarrative, dmap: Map<string, MetricDelta>): string {
  const related = n.related.map((m) => dmap.get(m)).filter((x): x is MetricDelta => Boolean(x));
  const adverse = related.filter((x) => x.isRegression);
  if (improved) {
    return adverse.length > 0
      ? `However, ${joinLabels(adverse)} regressed, which may partially offset the gain.`
      : `No adverse impact was observed in ${n.relatedLabel}.`;
  }
  return adverse.length > 0
    ? `This coincides with regressions in ${joinLabels(adverse)}, pointing to a shared root cause.`
    : `${capitalize(n.relatedLabel)} stayed within tolerance.`;
}

function deltaConclusion(d: MetricDelta, improved: boolean, dmap: Map<string, MetricDelta>): string {
  const n = METRIC_NARRATIVE[d.metric] ?? GENERIC_NARRATIVE;
  const implication = improved ? n.improved : n.regressed;
  const action = improved
    ? `Recommended action: accept the change and continue monitoring ${n.monitor} during ${SCENARIO} to verify the improvement persists across operational conditions.`
    : `Recommended action: root-cause the ${n.monitor} regression before promotion and re-test under ${SCENARIO}.`;
  return [implication, crossImpact(improved, n, dmap), action].join(" ");
}

function deltaToChange(d: MetricDelta, dmap: Map<string, MetricDelta>): BehavioralChange {
  const improved = d.higherIsBetter ? d.absoluteDelta > 0 : d.absoluteDelta < 0;
  const direction = d.absoluteDelta === 0 ? "neutral" : improved ? "improved" : "regressed";
  const summary = `${deltaSummary(d)} compared to the baseline.`;
  const conclusion = direction === "neutral" ? "" : deltaConclusion(d, improved, dmap);
  return { metric: d.metric, label: d.label, summary, conclusion, direction, severity: d.severity, magnitudePct: Math.abs(d.percentDelta) };
}

// --- Comparison report ---------------------------------------------------

function comparisonHypotheses(c: ComparisonResult): RootCauseHypothesis[] {
  const dmap = new Map(c.deltas.map((d) => [d.metric, d]));
  const worse = (m: string) => dmap.get(m)?.isRegression === true;
  const sev = (m: string): AnomalySeverity | "none" => dmap.get(m)?.severity ?? "none";
  const ev = (m: string): string | null => (dmap.has(m) ? deltaSummary(dmap.get(m)!) : null);
  const collect = (...ms: string[]) => ms.map(ev).filter((s): s is string => Boolean(s));

  const out: RootCauseHypothesis[] = [];

  if (worse("maxSensorTempC") && (worse("meanNetdMk") || worse("meanSnrDb"))) {
    out.push({
      title: "Sensor thermal soak raising the noise floor",
      detail:
        "Core temperature climbed while NETD/SNR degraded, the classic thermal-soak signature: a hotter focal plane lifts the noise floor and erodes effective sensitivity.",
      confidence: confidenceFrom([sev("maxSensorTempC"), sev("meanNetdMk"), sev("meanSnrDb")]),
      evidence: collect("maxSensorTempC", "meanNetdMk", "meanSnrDb"),
      relatedMetrics: ["maxSensorTempC", "meanNetdMk", "meanSnrDb"],
    });
  } else if (worse("meanNetdMk") || worse("meanSnrDb")) {
    out.push({
      title: "Degraded signal quality independent of thermal soak",
      detail:
        "SNR and/or NETD regressed without a corresponding rise in sensor temperature, pointing to optics contamination/defocus or a gain/calibration drift rather than overheating.",
      confidence: confidenceFrom([sev("meanNetdMk"), sev("meanSnrDb")]),
      evidence: collect("meanSnrDb", "meanNetdMk"),
      relatedMetrics: ["meanSnrDb", "meanNetdMk"],
    });
  }

  if (worse("detectionRate") || worse("classificationRate") || worse("meanConfidence")) {
    const upstream = collect("meanSnrDb", "meanDeltaTC").length > 0 && (worse("meanSnrDb") || worse("meanDeltaTC"));
    out.push({
      title: "Detection/classification pipeline regression",
      detail: upstream
        ? "Detection metrics fell alongside SNR/contrast, so the loss is likely downstream of reduced signal quality rather than a model change."
        : "Detection metrics fell without an obvious signal-quality cause, suggesting a model/threshold change or data-distribution shift.",
      confidence: confidenceFrom([sev("detectionRate"), sev("classificationRate"), sev("meanConfidence")]),
      evidence: collect("detectionRate", "classificationRate", "meanConfidence", "meanSnrDb", "meanDeltaTC"),
      relatedMetrics: ["detectionRate", "classificationRate", "meanConfidence"],
    });
  }

  if (worse("meanDeltaTC")) {
    out.push({
      title: "Reduced thermal contrast",
      detail:
        "Mean thermal contrast dropped, which can stem from environmental conditions, target emissivity, or a different range profile rather than a system fault.",
      confidence: confidenceFrom([sev("meanDeltaTC")]),
      evidence: collect("meanDeltaTC"),
      relatedMetrics: ["meanDeltaTC"],
    });
  }

  if (worse("meanLatencyMs") || worse("p95LatencyMs")) {
    const throttling = worse("maxSensorTempC");
    out.push({
      title: throttling ? "Latency from thermal throttling" : "Classifier compute contention",
      detail: throttling
        ? "Latency rose together with sensor temperature, consistent with thermal throttling of the compute path under sustained load."
        : "Classification latency rose without a thermal cause, consistent with CPU/GPU contention or a heavier model path.",
      confidence: confidenceFrom([sev("meanLatencyMs"), sev("p95LatencyMs")]),
      evidence: collect("meanLatencyMs", "p95LatencyMs", "maxSensorTempC"),
      relatedMetrics: ["meanLatencyMs", "p95LatencyMs"],
    });
  }

  if (worse("droppedFrameRate") || worse("meanFrameRateHz")) {
    out.push({
      title: "Imaging pipeline instability (frame drops)",
      detail:
        "The dropped-frame rate increased and/or effective frame rate fell, indicating capture-pipeline buffering or bandwidth pressure.",
      confidence: confidenceFrom([sev("droppedFrameRate"), sev("meanFrameRateHz")]),
      evidence: collect("droppedFrameRate", "meanFrameRateHz"),
      relatedMetrics: ["droppedFrameRate", "meanFrameRateHz"],
    });
  }

  if (worse("meanTrackErrorM")) {
    out.push({
      title: "Tracking degradation",
      detail:
        "Mean tracking error grew, often a second-order effect of dropped frames or detection gaps breaking track continuity.",
      confidence: confidenceFrom([sev("meanTrackErrorM")]),
      evidence: collect("meanTrackErrorM", "droppedFrameRate", "detectionRate"),
      relatedMetrics: ["meanTrackErrorM"],
    });
  }

  const cRank: Record<Confidence, number> = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => cRank[a.confidence] - cRank[b.confidence]);
}

// Map a hypothesis title to its validation key.
function validationKeyForTitle(title: string): keyof typeof VALIDATION | null {
  if (title.includes("thermal soak")) return "soak";
  if (title.includes("signal quality")) return "noiseFloor";
  if (title.includes("Detection")) return "detection";
  if (title.includes("thermal contrast")) return "contrast";
  if (title.includes("Latency") || title.includes("compute")) return "latency";
  if (title.includes("pipeline")) return "drops";
  if (title.includes("Tracking")) return "tracking";
  return null;
}

function stepsForHypotheses(hyps: RootCauseHypothesis[]): ValidationStep[] {
  const steps: ValidationStep[] = [];
  const seen = new Set<string>();
  for (const h of hyps) {
    const key = validationKeyForTitle(h.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const v = VALIDATION[key];
    const priority: ValidationStep["priority"] = h.confidence === "high" ? "P0" : h.confidence === "medium" ? "P1" : "P2";
    steps.push({ action: v.action, rationale: v.rationale, priority });
  }
  const pRank = { P0: 0, P1: 1, P2: 2 } as const;
  return steps.sort((a, b) => pRank[a.priority] - pRank[b.priority]);
}

function comparisonVerdict(c: ComparisonResult): IntelVerdict {
  const hasCritical = c.regressions.some((r) => r.severity === "critical");
  if (hasCritical) return "NO-GO";
  if (c.regressions.length > 0) return "CONDITIONAL";
  return "GO";
}

export function buildComparisonReport(c: ComparisonResult, generatedBy = "deterministic engine"): IntelligenceReport {
  const dmap = new Map(c.deltas.map((d) => [d.metric, d]));
  const changes = c.deltas
    .map((d) => deltaToChange(d, dmap))
    .filter((ch) => ch.direction === "regressed" || (ch.direction === "improved" && ch.magnitudePct >= NOISE_FLOOR_PCT))
    .sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || b.magnitudePct - a.magnitudePct);

  const hypotheses = comparisonHypotheses(c);
  const verdict = comparisonVerdict(c);
  const validationSteps = stepsForHypotheses(hypotheses);
  if (verdict === "GO" && c.promotable) {
    validationSteps.unshift({
      action: `Promote "${c.candidateName}" as the new locked baseline.`,
      rationale: "No regressions and a positive aggregate improvement make it a safe baseline.",
      priority: "P1",
    });
  }

  const crit = c.regressions.filter((r) => r.severity === "critical").length;
  const warn = c.regressions.filter((r) => r.severity === "warning").length;
  const pct = `${c.overallImprovementPct > 0 ? "+" : ""}${c.overallImprovementPct}%`;
  const headline =
    verdict === "NO-GO"
      ? `NO-GO — "${c.candidateName}" has ${crit} critical regression(s) (overall ${pct} vs "${c.baselineName}"); root-cause before promotion.`
      : verdict === "CONDITIONAL"
        ? `CONDITIONAL — "${c.candidateName}" has ${warn} minor regression(s) (overall ${pct}); promote only if within mission tolerance.`
        : c.overallVerdict === "improved"
          ? `GO — "${c.candidateName}" improves overall by ${pct} with no regressions; eligible for promotion.`
          : `GO — "${c.candidateName}" is on par with "${c.baselineName}" (overall ${pct}) with no regressions.`;

  const confidence: Confidence =
    crit > 0 ? "high" : hypotheses.length > 0 ? hypotheses[0].confidence : verdict === "GO" ? "high" : "medium";

  return {
    kind: "comparison",
    subject: `${c.candidateName} vs ${c.baselineName}`,
    verdict,
    headline,
    behavioralChanges: changes,
    rootCauseHypotheses: hypotheses,
    validationSteps,
    confidence,
    generatedBy,
  };
}

// --- Single-run report ---------------------------------------------------

const ANOMALY_ACTION: Record<string, string> = {
  snrDb: "review optics/gain calibration and the sensor noise floor over the affected segments",
  netdMk: "re-run the NETD calibration and inspect the optics for contamination or defocus",
  detected: "triage the missed detections against ground-truth annotations to confirm they are real",
  sensorTempC: "inspect sensor cooling/duty-cycle and correlate detection loss with the thermal-soak ramp",
  classificationLatencyMs: "profile the classifier under load and check for thermal throttling",
  trackErrorM: "audit tracker continuity across dropped frames and detection gaps",
  droppedFrame: "inspect the capture-pipeline buffers and bandwidth around the drop bursts",
};

function anomalyToChange(a: Anomaly): BehavioralChange {
  const action = ANOMALY_ACTION[a.metric] ?? "investigate and validate the affected segments";
  return {
    metric: a.metric,
    label: a.title,
    summary: a.description,
    conclusion: `${a.description} Recommended action: ${action} before relying on this run operationally.`,
    direction: "regressed",
    severity: a.severity,
    magnitudePct: 0,
  };
}

function runHypotheses(anomalies: Anomaly[]): RootCauseHypothesis[] {
  const byMetric = new Map<string, Anomaly[]>();
  for (const a of anomalies) {
    byMetric.set(a.metric, [...(byMetric.get(a.metric) ?? []), a]);
  }
  const ev = (...metrics: string[]) =>
    metrics.flatMap((m) => (byMetric.get(m) ?? []).map((a) => `${a.title}: ${a.description}`));
  const sevOf = (...metrics: string[]): (AnomalySeverity | "none")[] =>
    metrics.flatMap((m) => (byMetric.get(m) ?? []).map((a) => a.severity));

  const out: RootCauseHypothesis[] = [];
  if (byMetric.has("sensorTempC")) {
    out.push({
      title: "Sensor thermal soak raising the noise floor",
      detail: "Sensor core temperature crossed its ceiling; sustained heat lifts NETD and degrades detection.",
      confidence: confidenceFrom(sevOf("sensorTempC", "netdMk", "snrDb")),
      evidence: ev("sensorTempC", "netdMk", "snrDb"),
      relatedMetrics: ["sensorTempC", "netdMk", "snrDb"],
    });
  }
  if (byMetric.has("snrDb") || byMetric.has("netdMk")) {
    out.push({
      title: "Degraded signal quality (low SNR / elevated NETD)",
      detail: "Frames fell below the reliable-detection SNR floor or exceeded the NETD ceiling, hurting detection reliability.",
      confidence: confidenceFrom(sevOf("snrDb", "netdMk")),
      evidence: ev("snrDb", "netdMk"),
      relatedMetrics: ["snrDb", "netdMk"],
    });
  }
  if (byMetric.has("detected")) {
    out.push({
      title: "Close-range false negatives",
      detail: "High-contrast targets within close range went undetected — high-confidence false negatives to triage.",
      confidence: confidenceFrom(sevOf("detected")),
      evidence: ev("detected"),
      relatedMetrics: ["detected"],
    });
  }
  if (byMetric.has("classificationLatencyMs")) {
    out.push({
      title: "Classifier latency spikes",
      detail: "Latency outliers indicate the classifier is throttling or contending for compute under load.",
      confidence: confidenceFrom(sevOf("classificationLatencyMs")),
      evidence: ev("classificationLatencyMs"),
      relatedMetrics: ["classificationLatencyMs"],
    });
  }
  if (byMetric.has("droppedFrame")) {
    out.push({
      title: "Imaging pipeline frame drops",
      detail: "Dropped frames reduce effective frame rate and can break tracking continuity.",
      confidence: confidenceFrom(sevOf("droppedFrame")),
      evidence: ev("droppedFrame"),
      relatedMetrics: ["droppedFrame"],
    });
  }
  if (byMetric.has("trackErrorM")) {
    out.push({
      title: "Tracking error outliers",
      detail: "Tracking error spiked beyond statistical bounds, often secondary to drops or detection gaps.",
      confidence: confidenceFrom(sevOf("trackErrorM")),
      evidence: ev("trackErrorM"),
      relatedMetrics: ["trackErrorM"],
    });
  }
  const cRank: Record<Confidence, number> = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => cRank[a.confidence] - cRank[b.confidence]);
}

export function buildRunReport(name: string, analysis: RunAnalysis, generatedBy = "deterministic engine"): IntelligenceReport {
  const crit = analysis.anomalies.filter((a) => a.severity === "critical");
  const warn = analysis.anomalies.filter((a) => a.severity === "warning");
  const verdict: IntelVerdict = crit.length > 0 ? "NO-GO" : warn.length > 0 ? "CONDITIONAL" : "GO";
  const s = analysis.summary;

  const hypotheses = runHypotheses(analysis.anomalies);
  const validationSteps = stepsForHypotheses(hypotheses);
  if (verdict === "GO") {
    validationSteps.push({
      action: "Promote this run as a baseline candidate for future regression comparisons.",
      rationale: "All metrics stayed within nominal bounds with no anomalies.",
      priority: "P2",
    });
  }

  const headline =
    verdict === "NO-GO"
      ? `NO-GO — "${name}" failed effectiveness criteria with ${crit.length} critical anomaly(ies), led by "${crit[0].title}".`
      : verdict === "CONDITIONAL"
        ? `CONDITIONAL — "${name}" passed with ${warn.length} warning(s); review before relying on it operationally.`
        : `GO — "${name}" passed nominally: ${(s.detectionRate * 100).toFixed(1)}% detection, ${(s.classificationRate * 100).toFixed(1)}% classification, no anomalies.`;

  const confidence: Confidence = crit.length > 0 ? "high" : hypotheses.length > 0 ? hypotheses[0].confidence : "high";

  return {
    kind: "run",
    subject: name,
    verdict,
    headline,
    behavioralChanges: [...crit, ...warn].map(anomalyToChange),
    rootCauseHypotheses: hypotheses,
    validationSteps,
    confidence,
    generatedBy,
  };
}

// --- Portfolio (compare-all) report -------------------------------------

export function buildPortfolioReport(
  baselineName: string,
  comparisons: ComparisonResult[],
  generatedBy = "deterministic engine",
): PortfolioReport {
  const ranked: PortfolioRunEntry[] = comparisons
    .map((c) => ({
      candidateId: c.candidateId,
      candidateName: c.candidateName,
      verdict: comparisonVerdict(c),
      overallImprovementPct: c.overallImprovementPct,
      promotable: c.promotable,
      topIssue: c.regressions[0]?.label ?? null,
    }))
    .sort((a, b) => b.overallImprovementPct - a.overallImprovementPct);

  const promotable = ranked.filter((r) => r.promotable).map((r) => r.candidateName);

  // Aggregate root-cause titles across all regressing comparisons.
  const modeMap = new Map<string, { runs: string[]; confidences: Confidence[] }>();
  for (const c of comparisons) {
    for (const h of comparisonHypotheses(c)) {
      const entry = modeMap.get(h.title) ?? { runs: [], confidences: [] };
      entry.runs.push(c.candidateName);
      entry.confidences.push(h.confidence);
      modeMap.set(h.title, entry);
    }
  }
  const cRank: Record<Confidence, number> = { high: 0, medium: 1, low: 2 };
  const commonFailureModes = [...modeMap.entries()]
    .map(([mode, v]) => ({
      mode,
      affectedRuns: v.runs,
      confidence: v.confidences.sort((a, b) => cRank[a] - cRank[b])[0],
    }))
    .sort((a, b) => b.affectedRuns.length - a.affectedRuns.length);

  const best = ranked.find((r) => r.promotable) ?? null;
  const recommendedBaseline = best?.candidateName ?? null;
  const verdict: IntelVerdict = recommendedBaseline ? "GO" : "NO-GO";

  const headline = recommendedBaseline
    ? `GO — ${promotable.length} of ${ranked.length} run(s) beat baseline "${baselineName}"; recommend promoting "${recommendedBaseline}" (${best!.overallImprovementPct > 0 ? "+" : ""}${best!.overallImprovementPct}%).`
    : `NO-GO — none of ${ranked.length} run(s) beat baseline "${baselineName}"${commonFailureModes[0] ? `; dominant failure mode: ${commonFailureModes[0].mode} (${commonFailureModes[0].affectedRuns.length} run(s))` : ""}.`;

  const validationSteps: ValidationStep[] = [];
  if (recommendedBaseline) {
    validationSteps.push({
      action: `Promote "${recommendedBaseline}" to baseline and re-run the portfolio against it.`,
      rationale: "It is the strongest regression-free candidate in the batch.",
      priority: "P0",
    });
  }
  for (const m of commonFailureModes.slice(0, 3)) {
    const key = validationKeyForTitle(m.mode);
    if (!key) continue;
    validationSteps.push({
      action: `${VALIDATION[key].action} (affects ${m.affectedRuns.length} run(s))`,
      rationale: VALIDATION[key].rationale,
      priority: m.confidence === "high" ? "P0" : m.confidence === "medium" ? "P1" : "P2",
    });
  }

  return {
    kind: "portfolio",
    baselineName,
    runCount: ranked.length,
    verdict,
    headline,
    promotable,
    ranked,
    commonFailureModes,
    recommendedBaseline,
    validationSteps,
    generatedBy,
  };
}
