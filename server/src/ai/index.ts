import type { ComparisonResult, RunAnalysis } from "../types.js";
import { getConfig, resolveActiveProviderName } from "./config.js";
import { makeAnthropic, makeOpenAi } from "./llm.js";
import { MockProvider } from "./mock.js";
import type { AiProvider } from "./provider.js";

const mock = new MockProvider();

// Resolve the active provider on every call so runtime settings changes
// (new API key, switched provider) take effect immediately without a restart.
function resolveProvider(): AiProvider {
  const c = getConfig();
  if (c.provider === "mock") return mock;
  if ((c.provider === "auto" || c.provider === "openai") && c.openaiApiKey) {
    return makeOpenAi(c.openaiApiKey, c.openaiModel);
  }
  if ((c.provider === "auto" || c.provider === "anthropic") && c.anthropicApiKey) {
    return makeAnthropic(c.anthropicApiKey, c.anthropicModel);
  }
  return mock;
}

export function activeProviderName(): string {
  return resolveActiveProviderName();
}

// Always resolve: if a live provider fails, fall back to the deterministic mock
// so the dashboard never blocks on AI availability.
export async function summarizeRun(name: string, analysis: RunAnalysis): Promise<{ text: string; provider: string }> {
  const provider = resolveProvider();
  try {
    return { text: await provider.summarizeRun(name, analysis), provider: provider.name };
  } catch (err) {
    console.warn(`AI provider "${provider.name}" failed, using mock fallback:`, (err as Error).message);
    return { text: await mock.summarizeRun(name, analysis), provider: "mock (fallback)" };
  }
}

export async function summarizeComparison(c: ComparisonResult): Promise<{ text: string; provider: string }> {
  const provider = resolveProvider();
  try {
    return { text: await provider.summarizeComparison(c), provider: provider.name };
  } catch (err) {
    console.warn(`AI provider "${provider.name}" failed, using mock fallback:`, (err as Error).message);
    return { text: await mock.summarizeComparison(c), provider: "mock (fallback)" };
  }
}

// Validate the currently-resolved provider's credentials.
export async function testConnection(): Promise<{ ok: boolean; provider: string; message: string }> {
  const provider = resolveProvider();
  if (provider.name === "mock") {
    return { ok: true, provider: "mock", message: "Mock provider is active — no API key required." };
  }
  try {
    await provider.test();
    return { ok: true, provider: provider.name, message: `Connection to ${provider.name} succeeded.` };
  } catch (err) {
    return { ok: false, provider: provider.name, message: (err as Error).message };
  }
}
