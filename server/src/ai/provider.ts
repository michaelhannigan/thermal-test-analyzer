import type { ComparisonResult, IntelligenceReport, PortfolioReport, RunAnalysis } from "../types.js";

export interface AiProvider {
  name: string;
  analyzeRun(name: string, analysis: RunAnalysis): Promise<IntelligenceReport>;
  analyzeComparison(comparison: ComparisonResult): Promise<IntelligenceReport>;
  analyzePortfolio(baselineName: string, comparisons: ComparisonResult[]): Promise<PortfolioReport>;
  // Lightweight connectivity/credential check; throws on failure.
  test(): Promise<void>;
}

export interface ChatProvider {
  complete(system: string, user: string): Promise<string>;
}
