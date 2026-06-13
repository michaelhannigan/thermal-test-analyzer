# Glossary

Domain and project-specific terms used throughout the codebase and this wiki.

## Thermal imaging domain

- **SNR (signal-to-noise ratio)** — measured in dB. Higher is better; below ~6 dB detection becomes unreliable. Field `snrDb` on `FrameRecord` (`server/src/types.ts`).
- **NETD (noise-equivalent temperature difference)** — the sensor noise floor, in milli-kelvin (mK). Lower is better; rises with sensor temperature. Field `netdMk`.
- **ΔT / thermal contrast** — the temperature difference between target and background, in °C. Higher contrast makes a target easier to detect. Field `deltaTC` (`delta_t_c` in CSV).
- **Detection rate** — fraction of frames where a target was detected (`detected` flag). Reported as a percentage.
- **Classification rate** — fraction of frames where the detected target was also classified (`classified` flag).
- **Detection confidence** — model confidence 0..1 that a detection is valid. Field `detectionConfidence`.
- **Classification latency** — time to classify a frame, in ms. Field `classificationLatencyMs`. The p95 is tracked as a tail-latency indicator.
- **Track error** — tracking position error in meters. Field `trackErrorM`. Lower is better.
- **Sensor temperature / thermal soak** — sensor core temperature in °C (`sensorTempC`). It rises over a run ("soak"); high temperature lifts the noise floor and degrades detection.
- **Dropped frame** — a frame shed by the imaging pipeline (`droppedFrame`). Sustained drops reduce effective frame rate and break tracking continuity.
- **Frame** — one sampled record from a test run; the atomic unit of telemetry. Type `FrameRecord`.

## Analysis terms

- **Run** — one uploaded test, stored as a `StoredRun` with its parsed frames and computed `RunAnalysis`.
- **RunSummary** — ~15 aggregate metrics computed once per run (`server/src/analysis/analyze.ts`).
- **Anomaly** — a flagged issue from threshold or statistical detection, with a severity of `critical`, `warning`, or `info` (`server/src/analysis/anomalies.ts`).
- **MetricDelta** — a single metric's baseline-vs-candidate change, including percent delta, direction, and whether it is a regression (`server/src/analysis/compare.ts`).
- **Regression** — a metric that moved against its preferred direction by at least the warn threshold. A regression blocks promotion.
- **Overall improvement %** — the mean of direction-aware per-metric improvement percentages across a comparison. Positive means the candidate is better overall.
- **Baseline** — the single locked reference run that candidates are compared against. The first uploaded run is auto-seeded as the baseline.
- **Promotion** — replacing the baseline with a candidate. Allowed only when the candidate has zero regressions and a positive overall improvement (or via manual override).

## SRIA (Simulation Regression Intelligence Agent)

- **SRIA** — the AI analysis subsystem that turns analysis data into engineering conclusions. See [Regression intelligence agent](../features/regression-intelligence-agent.md).
- **Verdict** — the decision gate: `GO`, `CONDITIONAL`, or `NO-GO` (`IntelVerdict`).
- **Behavioral change** — a noise-filtered metric shift with a plain-language summary and an actionable conclusion (`BehavioralChange`).
- **Root-cause hypothesis** — a candidate explanation for observed changes, with a confidence level and supporting evidence (`RootCauseHypothesis`).
- **Validation step** — a prioritized (P0/P1/P2) recommended action to confirm or refute a hypothesis (`ValidationStep`).
- **Confidence** — `high` / `medium` / `low`, derived deterministically from anomaly severities (`Confidence`).
- **Portfolio report** — a cross-run report ranking every run against the baseline and surfacing common failure modes (`PortfolioReport`).
- **Intelligence report** — the per-run or per-comparison structured output (`IntelligenceReport`).

## AI / provider terms

- **Provider** — an implementation of `AiProvider` that produces reports (`server/src/ai/provider.ts`).
- **Deterministic engine / intelligence core** — `server/src/ai/intelligence.ts`; builds the full report from data with no LLM. The mock provider returns it verbatim.
- **Grounding** — feeding the deterministic draft to an LLM so its refinement stays consistent with the computed facts (`server/src/ai/prompts.ts`).
- **Active provider** — the provider currently resolved from config, shown in the header and Settings tab.
- **Fallback** — if a live provider fails or returns bad JSON, the system falls back to the deterministic draft / mock so analysis never blocks.
