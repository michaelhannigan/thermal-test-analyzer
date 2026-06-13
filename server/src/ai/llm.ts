import type { ComparisonResult, IntelligenceReport, PortfolioReport, RunAnalysis } from "../types.js";
import { buildComparisonReport, buildPortfolioReport, buildRunReport } from "./intelligence.js";
import {
  comparisonPromptUser,
  parsePortfolioReport,
  parseReport,
  portfolioPromptUser,
  runPromptUser,
  SYSTEM_PROMPT,
} from "./prompts.js";
import type { AiProvider, ChatProvider } from "./provider.js";

class OpenAiChat implements ChatProvider {
  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  async complete(system: string, user: string): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message?.content?.trim() ?? "";
  }
}

// OpenRouter exposes an OpenAI-compatible chat-completions API; only the host
// and a couple of optional attribution headers differ.
class OpenRouterChat implements ChatProvider {
  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  async complete(system: string, user: string): Promise<string> {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "HTTP-Referer": "https://github.com/michaelhannigan/thermal-test-analyzer",
        "X-Title": "Thermal Test Analyzer",
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenRouter API error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]?.message?.content?.trim() ?? "";
  }
}

class AnthropicChat implements ChatProvider {
  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  async complete(system: string, user: string): Promise<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        temperature: 0.2,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { content: { text: string }[] };
    return data.content[0]?.text?.trim() ?? "";
  }
}

// Local Ollama server using its native chat endpoint. No API key required,
// which makes it suitable for air-gapped deployments.
class OllamaChat implements ChatProvider {
  constructor(
    private baseUrl: string,
    private model: string,
  ) {}

  async complete(system: string, user: string): Promise<string> {
    const url = `${this.baseUrl.replace(/\/$/, "")}/api/chat`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        options: { temperature: 0.2 },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Ollama API error ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { message?: { content?: string } };
    return data.message?.content?.trim() ?? "";
  }
}

// Wraps any ChatProvider into the AiProvider summarization interface.
export class LlmProvider implements AiProvider {
  name: string;
  constructor(
    private chat: ChatProvider,
    providerName: string,
  ) {
    this.name = providerName;
  }

  async analyzeRun(name: string, analysis: RunAnalysis): Promise<IntelligenceReport> {
    const draft = buildRunReport(name, analysis, this.name);
    const raw = await this.chat.complete(SYSTEM_PROMPT, runPromptUser(name, analysis, draft));
    return this.refine(raw, draft);
  }

  async analyzeComparison(comparison: ComparisonResult): Promise<IntelligenceReport> {
    const draft = buildComparisonReport(comparison, this.name);
    const raw = await this.chat.complete(SYSTEM_PROMPT, comparisonPromptUser(comparison, draft));
    return this.refine(raw, draft);
  }

  async analyzePortfolio(baselineName: string, comparisons: ComparisonResult[]): Promise<PortfolioReport> {
    const draft = buildPortfolioReport(baselineName, comparisons, this.name);
    const raw = await this.chat.complete(SYSTEM_PROMPT, portfolioPromptUser(draft));
    try {
      return { ...parsePortfolioReport(raw, draft), generatedBy: this.name };
    } catch (err) {
      console.warn(`AI provider "${this.name}" returned unparseable portfolio output, using deterministic draft:`, (err as Error).message);
      return draft;
    }
  }

  // Parse the model JSON onto the grounded draft; if it is unusable, keep the draft.
  private refine(raw: string, draft: IntelligenceReport): IntelligenceReport {
    try {
      return { ...parseReport(raw, draft), generatedBy: this.name };
    } catch (err) {
      console.warn(`AI provider "${this.name}" returned unparseable output, using deterministic draft:`, (err as Error).message);
      return draft;
    }
  }

  async test(): Promise<void> {
    await this.chat.complete(
      "You are a connectivity probe. Reply with a single word.",
      "Reply with the word OK.",
    );
  }
}

export function makeOpenAi(apiKey: string, model: string): AiProvider {
  return new LlmProvider(new OpenAiChat(apiKey, model), "openai");
}

export function makeAnthropic(apiKey: string, model: string): AiProvider {
  return new LlmProvider(new AnthropicChat(apiKey, model), "anthropic");
}

export function makeOpenRouter(apiKey: string, model: string): AiProvider {
  return new LlmProvider(new OpenRouterChat(apiKey, model), "openrouter");
}

export function makeOllama(baseUrl: string, model: string): AiProvider {
  return new LlmProvider(new OllamaChat(baseUrl, model), "ollama");
}
