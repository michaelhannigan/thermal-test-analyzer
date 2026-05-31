import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compareRuns } from "../src/analysis/compare.js";
import { analyzeRun } from "../src/analysis/analyze.js";
import { parseCsv } from "../src/parser.js";
import { MockProvider } from "../src/ai/mock.js";
import type { StoredRun } from "../src/types.js";

const here = dirname(fileURLToPath(import.meta.url));
const csvA = readFileSync(join(here, "../sample-data/run-a-baseline.csv"), "utf-8");
const csvB = readFileSync(join(here, "../sample-data/run-b-candidate.csv"), "utf-8");

const { frames: fA, warnings: wA } = parseCsv(csvA);
const { frames: fB, warnings: wB } = parseCsv(csvB);
console.log(`Baseline: ${fA.length} frames, warnings: ${wA.join(", ") || "none"}`);
console.log(`Candidate: ${fB.length} frames, warnings: ${wB.join(", ") || "none"}`);

const now = Date.now();
const runA: StoredRun = { id: "a", name: "Baseline", createdAt: now, frames: fA, analysis: analyzeRun(fA) };
const runB: StoredRun = { id: "b", name: "Candidate", createdAt: now, frames: fB, analysis: analyzeRun(fB) };

console.log("\nBaseline summary:", runA.analysis.summary);
console.log("\nBaseline anomalies:");
runA.analysis.anomalies.forEach((a) => console.log(` [${a.severity}] ${a.title}`));

console.log("\nCandidate anomalies:");
runB.analysis.anomalies.forEach((a) => console.log(` [${a.severity}] ${a.title}`));

const cmp = compareRuns(runA, runB);
console.log("\nRegressions:", cmp.regressions.length);
cmp.regressions.forEach((r) => console.log(` [${r.severity}] ${r.label}: ${r.percentDelta}%`));

const ai = new MockProvider();
const summary = await ai.summarizeRun("Baseline", runA.analysis);
console.log("\nAI run summary:\n", summary);

const cmpSummary = await ai.summarizeComparison(cmp);
console.log("\nAI comparison summary:\n", cmpSummary);
