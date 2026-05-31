export type ProviderChoice = "auto" | "openai" | "anthropic" | "mock";

export interface AiRuntimeConfig {
  provider: ProviderChoice;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  openaiModel: string;
  anthropicModel: string;
}

// Public (masked) view of the config that is safe to send to the client.
export interface PublicAiConfig {
  provider: ProviderChoice;
  activeProvider: string;
  openaiModel: string;
  anthropicModel: string;
  openaiKeySet: boolean;
  anthropicKeySet: boolean;
  openaiKeyPreview: string | null;
  anthropicKeyPreview: string | null;
  source: { openai: "env" | "runtime" | "none"; anthropic: "env" | "runtime" | "none" };
}

const envChoice = (process.env.AI_PROVIDER ?? "auto").toLowerCase();
const validChoice: ProviderChoice = (["auto", "openai", "anthropic", "mock"] as const).includes(
  envChoice as ProviderChoice,
)
  ? (envChoice as ProviderChoice)
  : "auto";

// Track whether a key originated from the environment vs. a runtime override.
type KeySource = "env" | "runtime" | "none";
const source: { openai: KeySource; anthropic: KeySource } = {
  openai: process.env.OPENAI_API_KEY ? "env" : "none",
  anthropic: process.env.ANTHROPIC_API_KEY ? "env" : "none",
};

let config: AiRuntimeConfig = {
  provider: validChoice,
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
};

export function getConfig(): AiRuntimeConfig {
  return config;
}

export interface ConfigPatch {
  provider?: ProviderChoice;
  openaiApiKey?: string | null; // null clears the key, undefined leaves unchanged
  anthropicApiKey?: string | null;
  openaiModel?: string;
  anthropicModel?: string;
}

export function updateConfig(patch: ConfigPatch): void {
  if (patch.provider) config.provider = patch.provider;
  if (patch.openaiModel) config.openaiModel = patch.openaiModel;
  if (patch.anthropicModel) config.anthropicModel = patch.anthropicModel;

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
  if ((c.provider === "auto" || c.provider === "openai") && c.openaiApiKey) return "openai";
  if ((c.provider === "auto" || c.provider === "anthropic") && c.anthropicApiKey) return "anthropic";
  return "mock";
}

export function getPublicConfig(): PublicAiConfig {
  return {
    provider: config.provider,
    activeProvider: resolveActiveProviderName(),
    openaiModel: config.openaiModel,
    anthropicModel: config.anthropicModel,
    openaiKeySet: Boolean(config.openaiApiKey),
    anthropicKeySet: Boolean(config.anthropicApiKey),
    openaiKeyPreview: maskKey(config.openaiApiKey),
    anthropicKeyPreview: maskKey(config.anthropicApiKey),
    source: { ...source },
  };
}
