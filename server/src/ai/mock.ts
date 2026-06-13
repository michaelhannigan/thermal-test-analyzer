import type { ComparisonResult, IntelligenceReport, PortfolioReport, RunAnalysis } from "../types.js";
import { buildComparisonReport, buildPortfolioReport, buildRunReport } from "./intelligence.js";
import type { AiProvider } from "./provider.js";

// Deterministic, offline intelligence agent. Produces the full structured
// regression-intelligence report straight from the computed analysis — no API
// key required, fully air-gapped capable.
export class MockProvider implements AiProvider {
  name = "mock";

  async test(): Promise<void> {
    // Always available; no credentials required.
  }

  async analyzeRun(name: string, analysis: RunAnalysis): Promise<IntelligenceReport> {
    return buildRunReport(name, analysis, "deterministic engine");
  }

  async analyzeComparison(c: ComparisonResult): Promise<IntelligenceReport> {
    return buildComparisonReport(c, "deterministic engine");
  }

  async analyzePortfolio(baselineName: string, comparisons: ComparisonResult[]): Promise<PortfolioReport> {
    return buildPortfolioReport(baselineName, comparisons, "deterministic engine");
  }
}
