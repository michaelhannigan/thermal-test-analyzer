import type { ComparisonResult, RunAnalysis } from "../types.js";

export interface AiProvider {
  name: string;
  summarizeRun(name: string, analysis: RunAnalysis): Promise<string>;
  summarizeComparison(comparison: ComparisonResult): Promise<string>;
  // Lightweight connectivity/credential check; throws on failure.
  test(): Promise<void>;
}

export interface ChatProvider {
  complete(system: string, user: string): Promise<string>;
}
