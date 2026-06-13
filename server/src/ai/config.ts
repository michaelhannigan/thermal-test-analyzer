export type ProviderChoice = "auto" | "openai" | "anthropic" | "openrouter" | "mock" | "ollama";

export interface AiRuntimeConfig {
  provider: ProviderChoice;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  openrouterApiKey?: string;
  openaiModel: string;
  anthropicModel: string;
  openrouterModel: string;
  // Local Ollama server (air-gapped friendly; no API key required).
  ollamaBaseUrl: string;
  ollamaModel: string;
}

// Public (masked) view of the config that is safe to send to the client.
export interface PublicAiConfig {
  provider: ProviderChoice;
  activeProvider: string;
  openaiModel: string;
  anthropicModel: string;
  openrouterModel: string;
  openaiKeySet: boolean;
  anthropicKeySet: boolean;
  openrouterKeySet: boolean;
  openaiKeyPreview: string | null;
  anthropicKeyPreview: string | null;
  openrouterKeyPreview: string | null;
  source: {
    openai: "env" | "runtime" | "none";
    anthropic: "env" | "runtime" | "none";
    openrouter: "env" | "runtime" | "none";
  };
  // Base URL is not a secret, so it is returned plainly.
  ollamaBaseUrl: string;
  ollamaModel: string;
}

const envChoice = (process.env.AI_PROVIDER ?? "auto").toLowerCase();
const validChoice: ProviderChoice = (["auto", "openai", "anthropic", "openrouter", "mock", "ollama"] as const).includes(
  envChoice as ProviderChoice,
)
  ? (envChoice as ProviderChoice)
  : "auto";

// Track whether a key originated from the environment vs. a runtime override.
type KeySource = "env" | "runtime" | "none";
const source: { openai: KeySource; anthropic: KeySource; openrouter: KeySource } = {
  openai: process.env.OPENAI_API_KEY ? "env" : "none",
  anthropic: process.env.ANTHROPIC_API_KEY ? "env" : "none",
  openrouter: process.env.OPENROUTER_API_KEY ? "env" : "none",
};

const config: AiRuntimeConfig = {
  provider: validChoice,
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
  openrouterModel: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL ?? "llama3.1",
};

export function getConfig(): AiRuntimeConfig {
  return config;
}

export interface ConfigPatch {
  provider?: ProviderChoice;
  openaiApiKey?: string | null; // null clears the key, undefined leaves unchanged
  anthropicApiKey?: string | null;
  openrouterApiKey?: string | null;
  openaiModel?: string;
  anthropicModel?: string;
  openrouterModel?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
}

export function updateConfig(patch: ConfigPatch): void {
  if (patch.provider) config.provider = patch.provider;
  if (patch.openaiModel) config.openaiModel = patch.openaiModel;
  if (patch.anthropicModel) config.anthropicModel = patch.anthropicModel;
  if (patch.openrouterModel) config.openrouterModel = patch.openrouterModel.trim();
  if (patch.ollamaBaseUrl) config.ollamaBaseUrl = patch.ollamaBaseUrl.trim();
  if (patch.ollamaModel) config.ollamaModel = patch.ollamaModel.trim();

  if (patch.openaiApiKey !== undefined) {
    const trimmed = patch.openaiApiKey?.trim() || undefined;
    config.openaiApiKey = trimmed;
    source.openai = trimmed ? "runtime" : "none";
  }
  if (patch.anthropicApiKey !== undefined) {
    const trimmed = patch.anthropicApiKey?.trim() || undefined;
    config.anthropicApiKey = trimmed;
    source.anthropic = trimmed ? "runtime" : "none";
  }
  if (patch.openrouterApiKey !== undefined) {
    const trimmed = patch.openrouterApiKey?.trim() || undefined;
    config.openrouterApiKey = trimmed;
    source.openrouter = trimmed ? "runtime" : "none";
  }
}

function maskKey(key?: string): string | null {
  if (!key) return null;
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 3)}••••${key.slice(-4)}`;
}

// Resolves which concrete provider the current config will use.
export function resolveActiveProviderName(): string {
  const c = config;
  if (c.provider === "mock") return "mock";
  if (c.provider === "ollama") return "ollama";
  if (c.provider === "openrouter") return c.openrouterApiKey ? "openrouter" : "mock";
  if ((c.provider === "auto" || c.provider === "openai") && c.openaiApiKey) return "openai";
  if ((c.provider === "auto" || c.provider === "anthropic") && c.anthropicApiKey) return "anthropic";
  if (c.provider === "auto" && c.openrouterApiKey) return "openrouter";
  return "mock";
}

export function getPublicConfig(): PublicAiConfig {
  return {
    provider: config.provider,
    activeProvider: resolveActiveProviderName(),
    openaiModel: config.openaiModel,
    anthropicModel: config.anthropicModel,
    openrouterModel: config.openrouterModel,
    openaiKeySet: Boolean(config.openaiApiKey),
    anthropicKeySet: Boolean(config.anthropicApiKey),
    openrouterKeySet: Boolean(config.openrouterApiKey),
    openaiKeyPreview: maskKey(config.openaiApiKey),
    anthropicKeyPreview: maskKey(config.anthropicApiKey),
    openrouterKeyPreview: maskKey(config.openrouterApiKey),
    source: { ...source },
    ollamaBaseUrl: config.ollamaBaseUrl,
    ollamaModel: config.ollamaModel,
  };
}
