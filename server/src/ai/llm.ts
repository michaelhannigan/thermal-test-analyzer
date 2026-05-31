import type { ComparisonResult, RunAnalysis } from "../types.js";
import { comparisonPromptUser, runPromptUser, SYSTEM_PROMPT } from "./prompts.js";
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

// Wraps any ChatProvider into the AiProvider summarization interface.
export class LlmProvider implements AiProvider {
  name: string;
  constructor(
    private chat: ChatProvider,
    providerName: string,
  ) {
    this.name = providerName;
  }

  summarizeRun(name: string, analysis: RunAnalysis): Promise<string> {
    return this.chat.complete(SYSTEM_PROMPT, runPromptUser(name, analysis));
  }

  summarizeComparison(comparison: ComparisonResult): Promise<string> {
    return this.chat.complete(SYSTEM_PROMPT, comparisonPromptUser(comparison));
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
