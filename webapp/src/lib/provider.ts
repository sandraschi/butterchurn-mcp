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

const PROVIDER_KEY = "llm_provider";
const MODEL_KEY = "llm_model";
const GPU_KEY = "llm_gpu";

export function loadLLMConfig(): { provider: string; model: string } {
	try {
		return {
			provider: localStorage.getItem(PROVIDER_KEY) ?? "",
			model: localStorage.getItem(MODEL_KEY) ?? "",
		};
	} catch {
		return { provider: "", model: "" };
	}
}

export function saveLLMConfig(provider: string, model: string): void {
	try {
		localStorage.setItem(PROVIDER_KEY, provider);
		localStorage.setItem(MODEL_KEY, model);
	} catch {
		// storage unavailable
	}
}

export function loadTargetGpuIndex(): number {
	try {
		const n = Number(localStorage.getItem(GPU_KEY));
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

const PROVIDERS: {
	name: string;
	port: number;
	probe: string;
	modelKey: string;
}[] = [
	{
		name: "Ollama",
		port: 11434,
		probe: "/api/tags",
		modelKey: "models[].name",
	},
	{ name: "LM Studio", port: 1234, probe: "/v1/models", modelKey: "data[].id" },
	{ name: "vLLM", port: 8000, probe: "/v1/models", modelKey: "data[].id" },
];

export async function probeProviders(): Promise<DetectedProvider[]> {
	const results: DetectedProvider[] = [];
	for (const p of PROVIDERS) {
		const entry: DetectedProvider = {
			name: p.name,
			port: p.port,
			base: `http://127.0.0.1:${p.port}`,
			status: "probing",
		};
		results.push(entry);
		try {
			const controller = new AbortController();
			const id = setTimeout(() => controller.abort(), 3000);
			const r = await fetch(`http://127.0.0.1:${p.port}${p.probe}`, {
				signal: controller.signal,
			});
			clearTimeout(id);
			entry.status = r.ok ? "detected" : "not_found";
		} catch {
			entry.status = "not_found";
		}
	}
	return results;
}

export async function fetchModels(
	provider: string,
	base: string,
): Promise<string[]> {
	try {
		const path = provider === "Ollama" ? "/api/tags" : "/v1/models";
		const controller = new AbortController();
		const id = setTimeout(() => controller.abort(), 3000);
		const r = await fetch(`${base}${path}`, { signal: controller.signal });
		clearTimeout(id);
		if (!r.ok) return [];
		const data = (await r.json()) as {
			models?: { name: string }[];
			data?: { id: string }[];
		};
		if (provider === "Ollama" && data.models)
			return data.models.map((m) => m.name);
		if (data.data) return data.data.map((m) => m.id);
		return [];
	} catch {
		return [];
	}
}

export function buildChatUrl(config: { provider: string; base: string }):
	| string
	| null {
	if (!config.provider || !config.base) return null;
	return `${config.base}/v1/chat/completions`;
}

export interface GpuInfo {
	index: number;
	name: string;
	vramMb: number;
}

/** Enumerate NVIDIA GPUs via backend /api/llm/gpus (falls back to []). */
export async function fetchGpus(backendBase = ""): Promise<GpuInfo[]> {
	if (!backendBase) return [];
	try {
		const r = await fetch(`${backendBase}/api/llm/gpus`);
		if (!r.ok) return [];
		const d = (await r.json()) as { gpus?: GpuInfo[] };
		return Array.isArray(d.gpus) ? d.gpus : [];
	} catch {
		return [];
	}
}
