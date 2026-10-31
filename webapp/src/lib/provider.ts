/**
 * Compat shim: legacy provider.ts surface, now backend-first.
 *
 * Canonical stack lives in `@/lib/llm` (vendored from
 * mcp-central-docs/templates/llm/lib-llm.ts). This file keeps the old
 * imports working (Settings, Chat) while fixing the two bugs that broke
 * Settings:
 *
 * - fetchGpus("") returned [] always (`if (!backendBase) return []`).
 * - probeProviders/fetchModels hit Ollama/LM Studio from the browser,
 *   which CORS-blocks. All traffic now goes through the backend proxy.
 */

import {
  fetchGpus as fetchGpusNew,
  fetchLlmSettings,
  fetchModels as fetchModelsNew,
  fetchProviders,
  loadSelection,
  type GpuInfo as NewGpuInfo,
  saveSelection,
} from "@/lib/llm";

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

const GPU_KEY = "llm_gpu";

/** Local mirror of the backend selection (fast boot; backend is truth). */
export function loadLLMConfig(): { provider: string; model: string } {
  return loadSelection();
}

export function saveLLMConfig(provider: string, model: string): void {
  saveSelection(provider, model);
}

export function loadTargetGpuIndex(): number {
  try {
    const raw = localStorage.getItem(GPU_KEY);
    if (raw === null) return -1;
    const n = Number(raw);
    return Number.isFinite(n) ? n : -1;
  } catch {
    return -1;
  }
}

export function saveTargetGpuIndex(index: number): void {
  try {
    localStorage.setItem(GPU_KEY, String(index));
  } catch {
    // storage unavailable
  }
}

function portHint(baseUrl: string): number {
  const m = baseUrl.match(/:(\d+)$/);
  return m ? Number(m[1]) : 0;
}

function labelToName(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("ollama")) return "Ollama";
  if (l.includes("lm studio")) return "LM Studio";
  if (l.includes("vllm")) return "vLLM";
  return label;
}

/** Backend-first provider probe (never touches 127.0.0.1 from the browser). */
export async function probeProviders(): Promise<DetectedProvider[]> {
  try {
    const { providers } = await fetchProviders();
    return providers.map((p) => ({
      name: labelToName(p.label),
      port: portHint(p.base_url),
      base: p.base_url,
      status: (p.detected ?? p.configured) ? "detected" : "not_found",
    }));
  } catch {
    return [];
  }
}

/** Backend-first model list (live when reachable/keyed, else curated). */
export async function fetchModels(
  provider: string,
  _base?: string,
): Promise<string[]> {
  const id = provider.toLowerCase().includes("lm")
    ? "lmstudio"
    : provider.toLowerCase().includes("vllm")
      ? "vllm"
      : provider.toLowerCase().includes("ollama")
        ? "ollama"
        : provider.toLowerCase();
  try {
    const m = await fetchModelsNew(id);
    return m.models;
  } catch {
    return [];
  }
}

export function buildChatUrl(config: {
  provider: string;
  base: string;
}): string | null {
  if (!config.provider || !config.base) return null;
  return `${config.base}/v1/chat/completions`;
}

export interface GpuInfo {
  index: number;
  name: string;
  vramMb: number;
}

/** Backend-first GPU telemetry (compat shape: vramMb = total_mb). */
export async function fetchGpus(_backendBase = ""): Promise<GpuInfo[]> {
  try {
    const [gpus, settings] = await Promise.allSettled([
      fetchGpusNew(),
      fetchLlmSettings().catch(() => null),
    ]);
    void settings;
    if (gpus.status !== "fulfilled") return [];
    return (gpus.value as NewGpuInfo[]).map((g) => ({
      index: g.index,
      name: g.name,
      vramMb: g.total_mb,
    }));
  } catch {
    return [];
  }
}
