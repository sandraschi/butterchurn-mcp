import { motion } from "framer-motion";
import { CheckCircle2, Cpu, HelpCircle, Monitor, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { pickPreferredModel, pickTargetGpu } from "../lib/modelPreference";
import {
	type DetectedProvider,
	type GpuInfo,
	fetchGpus,
	fetchModels,
	loadLLMConfig,
	loadTargetGpuIndex,
	probeProviders,
	saveLLMConfig,
	saveTargetGpuIndex,
} from "../lib/provider";

export default function SettingsPage() {
	const [bpm, setBpm] = useState(128);
	const [bpmSaved, setBpmSaved] = useState(false);
	const [bpmError, setBpmError] = useState("");

	const [providers, setProviders] = useState<DetectedProvider[]>([]);
	const [selectedProvider, setSelectedProvider] = useState("");
	const [selectedModel, setSelectedModel] = useState("");
	const [models, setModels] = useState<string[]>([]);
	const [probing, setProbing] = useState(true);

	const [gpus, setGpus] = useState<GpuInfo[]>([]);
	const [targetGpuIndex, setTargetGpuIndex] = useState(-1);
	const [gpuDetected, setGpuDetected] = useState(false);
	const [gpuName, setGpuName] = useState("");
	const mountedRef = useRef(true);

	const loadBpm = useCallback(async () => {
		try {
			const r = await fetch("/api/bpm");
			if (r.ok) {
				const d = await r.json();
				setBpm(d.bpm ?? 128);
			}
		} catch {}
	}, []);

	useEffect(() => {
		loadBpm();
	}, [loadBpm]);

	useEffect(() => {
		const saved = loadLLMConfig();
		const savedGpu = loadTargetGpuIndex();
		(async () => {
			try {
				// GPU enumeration + hardware detection (target-GPU placement).
				let target: GpuInfo | null = null;
				const gpuList = await fetchGpus("");
				if (!mountedRef.current) return;
				setGpus(gpuList);
				if (gpuList.length > 0) {
					target = pickTargetGpu(gpuList, savedGpu >= 0 ? savedGpu : undefined);
					if (target) {
						setTargetGpuIndex(target.index);
						setGpuDetected(true);
					}
				}

				// Server-side detection: installed + loaded (resident) Ollama models
				// via the backend, avoiding browser CORS hangs against localhost.
				let detect: {
					ollama?: {
						available?: boolean;
						models?: string[];
						loaded?: string[];
					};
				} = {};
				try {
					const dr = await fetch("/api/llm/detect");
					if (dr.ok) detect = (await dr.json()) as typeof detect;
				} catch {
					// fall through to port probing
				}

				const detected = await probeProviders();
				if (!mountedRef.current) return;
				setProviders(detected);
				setProbing(false);

				const detectedNames = detected
					.filter((p) => p.status === "detected")
					.map((p) => p.name);
				const preferred =
					saved.provider && detectedNames.includes(saved.provider)
						? saved.provider
						: detectedNames[0] || "";
				setSelectedProvider(preferred);

				if (preferred === "Ollama") {
					// Resident-first: never evict a loaded model; respect target GPU VRAM.
					const installed = detect.ollama?.models ?? [];
					const loaded = detect.ollama?.loaded ?? [];
					const resident = pickPreferredModel(loaded, installed, target);
					setModels([...installed].sort());
					const chosen =
						saved.model && installed.includes(saved.model)
							? saved.model
							: resident;
					setSelectedModel(chosen);
					saveLLMConfig("Ollama", chosen);
				} else if (preferred) {
					const p = detected.find((d) => d.name === preferred);
					if (p) {
						const ms = await fetchModels(preferred, p.base);
						if (!mountedRef.current) return;
						setModels(ms);
						const preferredModel =
							saved.model && ms.includes(saved.model)
								? saved.model
								: ms[0] || "";
						setSelectedModel(preferredModel);
					}
				}

				// GPU Opportunity: high-end GPU present but no local LLM.
				const highGpu = gpuList.some((g) => g.vramMb >= 12288);
				if (highGpu && detectedNames.length === 0) {
					const first = gpuList.find((g) => g.vramMb >= 12288);
					setGpuName(first?.name ?? "GPU");
				}
			} catch (err) {
				// eslint-disable-next-line no-console
				console.error("LLM detection failed", err);
			} finally {
				if (mountedRef.current) setProbing(false);
			}
		})();
		return () => {
			mountedRef.current = false;
		};
	}, []);

	const handleProviderChange = async (name: string) => {
		setSelectedProvider(name);
		setSelectedModel("");
		setModels([]);
		const p = providers.find((d) => d.name === name);
		if (!p) return;
		const ms = await fetchModels(name, p.base);
		setModels(ms);
		const first = ms[0] || "";
		setSelectedModel(first);
		saveLLMConfig(name, first);
	};

	const handleModelChange = (model: string) => {
		setSelectedModel(model);
		saveLLMConfig(selectedProvider, model);
	};

	const handleGpuChange = (index: number) => {
		setTargetGpuIndex(index);
		saveTargetGpuIndex(index);
	};

	const saveBpm = async () => {
		setBpmError("");
		setBpmSaved(false);
		try {
			const r = await fetch("/api/bpm", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ bpm }),
			});
			if (!r.ok) {
				const d = await r.json();
				setBpmError(d.detail ?? "Failed to save");
				return;
			}
			setBpmSaved(true);
			setTimeout(() => setBpmSaved(false), 2000);
		} catch {
			setBpmError("Backend offline");
		}
	};

	const detectedCount = providers.filter((p) => p.status === "detected").length;

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			className="p-6 max-w-2xl pb-8 h-full overflow-y-auto space-y-8"
		>
			<div>
				<h1 className="text-xl font-semibold text-zinc-100">Settings</h1>
				<p className="text-sm text-zinc-500 mt-0.5">
					Backend and LLM configuration
				</p>
			</div>

			<section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
				<div className="flex items-center gap-2">
					<Cpu size={16} className="text-amber-400" />
					<h2 className="text-sm font-semibold text-zinc-200">
						Local Intelligence
					</h2>
				</div>

				{probing ? (
					<div className="flex items-center gap-2 text-sm text-zinc-500">
						<span className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse" />
						Probing for LLM providers…
					</div>
				) : detectedCount === 0 ? (
					<div className="bg-amber-900/20 border border-amber-800/30 rounded-lg px-4 py-3 text-sm text-amber-300">
						No local LLM detected. Install{" "}
						<a
							href="https://ollama.com"
							className="underline hover:text-amber-200"
							target="_blank"
							rel="noreferrer"
						>
							Ollama
						</a>{" "}
						or{" "}
						<a
							href="https://lmstudio.ai"
							className="underline hover:text-amber-200"
							target="_blank"
							rel="noreferrer"
						>
							LM Studio
						</a>{" "}
						to enable AI features.
					</div>
				) : null}

				{!probing && gpuDetected && gpuName && detectedCount === 0 && (
					<div className="bg-blue-950/40 border border-blue-800/40 rounded-lg px-4 py-3 text-sm text-blue-300 flex items-start gap-2">
						<Monitor size={14} className="mt-0.5 shrink-0" />
						<span>
							High-performance GPU ({gpuName}) detected. Install Ollama/LM
							Studio to unlock AI features for free.
						</span>
					</div>
				)}

				{providers.length > 0 && (
					<div className="space-y-3">
						<div className="flex flex-wrap gap-2">
							{providers.map((p) => (
								<div
									key={p.name}
									className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${
										p.status === "detected"
											? "bg-emerald-900/30 text-emerald-300"
											: "bg-zinc-800 text-zinc-500"
									}`}
								>
									{p.status === "probing" ? (
										<span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" />
									) : p.status === "detected" ? (
										<CheckCircle2 size={10} className="text-emerald-400" />
									) : (
										<XCircle size={10} />
									)}
									{p.name} :{p.port}
								</div>
							))}
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<div>
								<label
									htmlFor="llm-provider-select"
									className="block text-xs text-zinc-400 mb-1"
								>
									Provider
								</label>
								<select
									id="llm-provider-select"
									value={selectedProvider}
									onChange={(e) => handleProviderChange(e.target.value)}
									className="w-full h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200"
									data-testid="llm-provider-select"
								>
									{providers.filter((p) => p.status === "detected").length ===
										0 && <option value="">No provider detected</option>}
									{providers
										.filter((p) => p.status === "detected")
										.map((p) => (
											<option key={p.name} value={p.name}>
												{p.name}
											</option>
										))}
								</select>
							</div>
							<div>
								<label
									htmlFor="llm-model-select"
									className="block text-xs text-zinc-400 mb-1"
								>
									Model
								</label>
								<select
									id="llm-model-select"
									value={selectedModel}
									onChange={(e) => handleModelChange(e.target.value)}
									className="w-full h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200"
									data-testid="llm-model-select"
									disabled={models.length === 0}
								>
									{models.length === 0 && (
										<option value="">No models found</option>
									)}
									{models.map((m) => (
										<option key={m} value={m}>
											{m}
										</option>
									))}
								</select>
							</div>
							{gpus.length > 1 && (
								<div>
									<label
										htmlFor="llm-gpu-select"
										className="block text-xs text-zinc-400 mb-1"
									>
										GPU
									</label>
									<select
										id="llm-gpu-select"
										value={targetGpuIndex}
										onChange={(e) => handleGpuChange(Number(e.target.value))}
										className="w-full h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200"
										data-testid="llm-gpu-select"
									>
										{gpus.map((g) => (
											<option key={g.index} value={g.index}>
												GPU {g.index} - {g.name} ({Math.round(g.vramMb / 1024)}{" "}
												GB)
											</option>
										))}
									</select>
									<p className="text-[10px] text-zinc-600 mt-1">
										Local models land on this card (avoids evicting the resident
										agentic model on GPU 0).
									</p>
								</div>
							)}
						</div>

						{selectedProvider && selectedModel && (
							<div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-900/20 rounded-lg px-3 py-2">
								<CheckCircle2 size={12} />
								Active: {selectedProvider} / {selectedModel}
							</div>
						)}
					</div>
				)}
			</section>

			<section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
				<div className="flex items-center gap-2">
					<HelpCircle size={16} className="text-amber-400" />
					<h2 className="text-sm font-semibold text-zinc-200">BPM</h2>
				</div>
				<div className="flex items-center gap-4 flex-wrap">
					<input
						type="range"
						min={60}
						max={240}
						value={bpm}
						onChange={(e) => setBpm(Number(e.target.value))}
						className="w-40 accent-amber-500"
					/>
					<input
						type="number"
						value={bpm}
						onChange={(e) => setBpm(Number(e.target.value))}
						className="w-20 h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 text-center font-mono"
					/>
					<button
						type="button"
						onClick={saveBpm}
						className="h-9 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm text-white font-medium transition-colors"
					>
						{bpmSaved ? "Saved" : "Save"}
					</button>
					{bpmError && <span className="text-xs text-red-400">{bpmError}</span>}
				</div>
			</section>
		</motion.div>
	);
}
