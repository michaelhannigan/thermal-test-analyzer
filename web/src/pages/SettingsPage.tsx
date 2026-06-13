import { useEffect, useState } from "react";
import { api, type ProviderChoice, type PublicAiConfig } from "../api.ts";

interface Props {
  onProviderChange?: (active: string) => void;
}

const PROVIDERS: { value: ProviderChoice; label: string; hint: string }[] = [
  { value: "auto", label: "Auto", hint: "OpenAI, else Anthropic, else OpenRouter, else Mock" },
  { value: "openai", label: "OpenAI", hint: "Use OpenAI chat completions" },
  { value: "anthropic", label: "Anthropic", hint: "Use Anthropic messages API" },
  { value: "openrouter", label: "OpenRouter", hint: "Use OpenRouter (OpenAI-compatible) API" },
  { value: "ollama", label: "Ollama (local)", hint: "Local Ollama server — air-gapped friendly, no key" },
  { value: "mock", label: "Mock", hint: "Offline deterministic summarizer (no key)" },
];

export function SettingsPage({ onProviderChange }: Props) {
  const [cfg, setCfg] = useState<PublicAiConfig | null>(null);
  const [provider, setProvider] = useState<ProviderChoice>("auto");
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("");
  const [anthropicModel, setAnthropicModel] = useState("");
  const [openrouterModel, setOpenrouterModel] = useState("");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("");
  const [ollamaModel, setOllamaModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  const load = (c: PublicAiConfig) => {
    setCfg(c);
    setProvider(c.provider);
    setOpenaiModel(c.openaiModel);
    setAnthropicModel(c.anthropicModel);
    setOpenrouterModel(c.openrouterModel);
    setOllamaBaseUrl(c.ollamaBaseUrl);
    setOllamaModel(c.ollamaModel);
    onProviderChange?.(c.activeProvider);
  };

  useEffect(() => {
    api.getSettings().then(load).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flash = (ok: boolean, msg: string) => {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const patch = {
        provider,
        openaiModel: openaiModel || undefined,
        anthropicModel: anthropicModel || undefined,
        openrouterModel: openrouterModel || undefined,
        ollamaBaseUrl: ollamaBaseUrl || undefined,
        ollamaModel: ollamaModel || undefined,
        // only send keys when the user typed something new
        ...(openaiKey ? { openaiApiKey: openaiKey } : {}),
        ...(anthropicKey ? { anthropicApiKey: anthropicKey } : {}),
        ...(openrouterKey ? { openrouterApiKey: openrouterKey } : {}),
      };
      const updated = await api.updateSettings(patch);
      load(updated);
      setOpenaiKey("");
      setAnthropicKey("");
      setOpenrouterKey("");
      flash(true, `Saved. Active provider: ${updated.activeProvider}.`);
    } catch (e) {
      flash(false, (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = async (which: "openai" | "anthropic" | "openrouter") => {
    const patch =
      which === "openai"
        ? { openaiApiKey: null }
        : which === "anthropic"
          ? { anthropicApiKey: null }
          : { openrouterApiKey: null };
    const labels = { openai: "OpenAI", anthropic: "Anthropic", openrouter: "OpenRouter" };
    try {
      const updated = await api.updateSettings(patch);
      load(updated);
      flash(true, `${labels[which]} key cleared.`);
    } catch (e) {
      flash(false, (e as Error).message);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const r = await api.testConnection();
      flash(r.ok, `[${r.provider}] ${r.message}`);
    } catch (e) {
      flash(false, (e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  if (!cfg) return <div style={{ color: "var(--text-dim)", fontFamily: "var(--mono)", fontSize: 13 }}>Loading settings…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 680 }}>
      <div
        style={{
          padding: "14px 16px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Active Provider
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--mono)", color: cfg.activeProvider === "mock" ? "var(--warning)" : "var(--success)" }}>
            {cfg.activeProvider}
          </div>
        </div>
        <button
          onClick={handleTest}
          disabled={testing}
          style={{
            padding: "7px 16px",
            borderRadius: 4,
            fontFamily: "var(--mono)",
            fontSize: 13,
            fontWeight: 600,
            background: "var(--surface-2)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            cursor: testing ? "not-allowed" : "pointer",
          }}
        >
          {testing ? "Testing…" : "Test Connection"}
        </button>
      </div>

      {toast && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "var(--radius)",
            fontSize: 13,
            fontFamily: "var(--mono)",
            color: toast.ok ? "var(--success)" : "var(--critical)",
            background: toast.ok ? "var(--success-bg)" : "var(--critical-bg)",
            border: `1px solid ${toast.ok ? "var(--success)" : "var(--critical)"}55`,
          }}
        >
          {toast.msg}
        </div>
      )}

      <Field label="Provider Mode">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
          {PROVIDERS.map((p) => (
            <button
              key={p.value}
              onClick={() => setProvider(p.value)}
              title={p.hint}
              style={{
                textAlign: "left",
                padding: "10px 12px",
                borderRadius: 6,
                border: `1px solid ${provider === p.value ? "var(--accent)" : "var(--border)"}`,
                background: provider === p.value ? "rgba(59,130,246,.08)" : "var(--surface-2)",
                color: "var(--text)",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, fontFamily: "var(--mono)" }}>{p.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2, lineHeight: 1.4 }}>{p.hint}</div>
            </button>
          ))}
        </div>
      </Field>

      <KeyField
        label="OpenAI API Key"
        placeholder="sk-..."
        value={openaiKey}
        onChange={setOpenaiKey}
        isSet={cfg.openaiKeySet}
        preview={cfg.openaiKeyPreview}
        source={cfg.source.openai}
        onClear={() => handleClearKey("openai")}
        model={openaiModel}
        onModelChange={setOpenaiModel}
        modelPlaceholder="gpt-4o-mini"
      />

      <KeyField
        label="Anthropic API Key"
        placeholder="sk-ant-..."
        value={anthropicKey}
        onChange={setAnthropicKey}
        isSet={cfg.anthropicKeySet}
        preview={cfg.anthropicKeyPreview}
        source={cfg.source.anthropic}
        onClear={() => handleClearKey("anthropic")}
        model={anthropicModel}
        onModelChange={setAnthropicModel}
        modelPlaceholder="claude-3-5-haiku-latest"
      />

      <KeyField
        label="OpenRouter API Key"
        placeholder="sk-or-..."
        value={openrouterKey}
        onChange={setOpenrouterKey}
        isSet={cfg.openrouterKeySet}
        preview={cfg.openrouterKeyPreview}
        source={cfg.source.openrouter}
        onClear={() => handleClearKey("openrouter")}
        model={openrouterModel}
        onModelChange={setOpenrouterModel}
        modelPlaceholder="openai/gpt-4o-mini"
      />

      <LocalProviderField
        label="Ollama (Local Server)"
        baseUrl={ollamaBaseUrl}
        onBaseUrlChange={setOllamaBaseUrl}
        baseUrlPlaceholder="http://localhost:11434"
        model={ollamaModel}
        onModelChange={setOllamaModel}
        modelPlaceholder="llama3.1"
      />

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "8px 22px",
            borderRadius: 4,
            fontFamily: "var(--mono)",
            fontSize: 13,
            fontWeight: 600,
            background: saving ? "var(--surface-2)" : "var(--accent)",
            color: saving ? "var(--text-dim)" : "white",
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
          Applied in real time — no restart needed. Keys are held in server memory only.
        </span>
      </div>

      <p style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.6, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
        Keys are stored in the server process memory (not written to disk) and are never returned to the browser —
        only a masked preview is shown. They reset when the server restarts; for persistence use environment variables
        (<span style={{ fontFamily: "var(--mono)" }}>OPENAI_API_KEY</span> /{" "}
        <span style={{ fontFamily: "var(--mono)" }}>ANTHROPIC_API_KEY</span>).
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", fontFamily: "var(--mono)", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function KeyField({
  label, placeholder, value, onChange, isSet, preview, source, onClear, model, onModelChange, modelPlaceholder,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  isSet: boolean;
  preview: string | null;
  source: "env" | "runtime" | "none";
  onClear: () => void;
  model: string;
  onModelChange: (v: string) => void;
  modelPlaceholder: string;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: 4,
    padding: "8px 10px",
    fontSize: 13,
    fontFamily: "var(--mono)",
  };
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        {isSet ? (
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontFamily: "var(--mono)" }}>
            <span style={{ color: "var(--success)" }}>● set</span>
            <span style={{ color: "var(--text-dim)" }}>{preview}</span>
            <span style={{ color: "var(--text-dim)", padding: "1px 6px", background: "var(--surface-2)", borderRadius: 3 }}>{source}</span>
            <button onClick={onClear} style={{ color: "var(--critical)", fontSize: 11, fontFamily: "var(--mono)" }}>clear</button>
          </span>
        ) : (
          <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-dim)" }}>● not set</span>
        )}
      </div>
      <input
        type="password"
        autoComplete="off"
        placeholder={isSet ? "•••••••• (leave blank to keep current)" : placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4, fontFamily: "var(--mono)" }}>Model</div>
        <input
          type="text"
          placeholder={modelPlaceholder}
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          style={inputStyle}
        />
      </div>
    </div>
  );
}

function LocalProviderField({
  label, baseUrl, onBaseUrlChange, baseUrlPlaceholder, model, onModelChange, modelPlaceholder,
}: {
  label: string;
  baseUrl: string;
  onBaseUrlChange: (v: string) => void;
  baseUrlPlaceholder: string;
  model: string;
  onModelChange: (v: string) => void;
  modelPlaceholder: string;
}) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: 4,
    padding: "8px 10px",
    fontSize: 13,
    fontFamily: "var(--mono)",
  };
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-dim)" }}>no API key required</span>
      </div>
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4, fontFamily: "var(--mono)" }}>Base URL</div>
      <input
        type="text"
        autoComplete="off"
        placeholder={baseUrlPlaceholder}
        value={baseUrl}
        onChange={(e) => onBaseUrlChange(e.target.value)}
        style={inputStyle}
      />
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4, fontFamily: "var(--mono)" }}>Model</div>
        <input
          type="text"
          placeholder={modelPlaceholder}
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          style={inputStyle}
        />
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-dim)", lineHeight: 1.5 }}>
        Select the "Ollama (local)" provider mode above to use this. Ensure the model is pulled on the local server
        (<span style={{ fontFamily: "var(--mono)" }}>ollama pull {model || modelPlaceholder}</span>).
      </div>
    </div>
  );
}
