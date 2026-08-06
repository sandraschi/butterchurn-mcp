export interface DetectedProvider {
  name: string;
  port: number;
  base: string;
  status: "probing" | "detected" | "not_found";
}

export interface LLMConfig {
  provider: string;
  model: string;
  providers: DetectedProvider[];
  models: string[];
}

const STORAGE_KEY = "butterchurn:llm";

export function loadLLMConfig(): { provider: string; model: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { provider: "", model: "" };
    const parsed = JSON.parse(raw);
    return { provider: parsed.provider ?? "", model: parsed.model ?? "" };
  } catch {
    return { provider: "", model: "" };
  }
}

export function saveLLMConfig(provider: string, model: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ provider, model }));
}

const PROVIDERS: { name: string; port: number; probe: string; modelKey: string }[] = [
  { name: "Ollama", port: 11434, probe: "/api/tags", modelKey: "models[].name" },
  { name: "LM Studio", port: 1234, probe: "/v1/models", modelKey: "data[].id" },
  { name: "vLLM", port: 8000, probe: "/v1/models", modelKey: "data[].id" },
];

export async function probeProviders(): Promise<DetectedProvider[]> {
  const results: DetectedProvider[] = [];
  for (const p of PROVIDERS) {
    const entry: DetectedProvider = { name: p.name, port: p.port, base: `http://127.0.0.1:${p.port}`, status: "probing" };
    results.push(entry);
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000);
      const r = await fetch(`http://127.0.0.1:${p.port}${p.probe}`, { signal: controller.signal });
      clearTimeout(id);
      entry.status = r.ok ? "detected" : "not_found";
    } catch {
      entry.status = "not_found";
    }
  }
  return results;
}

export async function fetchModels(provider: string, base: string): Promise<string[]> {
  try {
    const path = provider === "Ollama" ? "/api/tags" : "/v1/models";
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 3000);
    const r = await fetch(`${base}${path}`, { signal: controller.signal });
    clearTimeout(id);
    if (!r.ok) return [];
    const data = await r.json();
    if (provider === "Ollama" && data.models) return data.models.map((m: any) => m.name);
    if (data.data) return data.data.map((m: any) => m.id);
    return [];
  } catch {
    return [];
  }
}

export function buildChatUrl(config: { provider: string; base: string }): string | null {
  if (!config.provider || !config.base) return null;
  return `${config.base}/v1/chat/completions`;
}
