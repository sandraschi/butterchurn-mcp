import { motion } from "framer-motion";
import { CheckCircle2, Cpu, HelpCircle, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	type DetectedProvider,
	type LLMConfig,
	fetchModels,
	loadLLMConfig,
	probeProviders,
	saveLLMConfig,
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
		(async () => {
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

			if (preferred) {
				const p = detected.find((d) => d.name === preferred);
				if (p) {
					const ms = await fetchModels(preferred, p.base);
					if (!mountedRef.current) return;
					setModels(ms);
					const preferredModel =
						saved.model && ms.includes(saved.model) ? saved.model : ms[0] || "";
					setSelectedModel(preferredModel);
				}
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
			className="p-6 max-w-2xl pb-8 h-full space-y-8"
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
								<label className="block text-xs text-zinc-400 mb-1">
									Provider
								</label>
								<select
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
								<label className="block text-xs text-zinc-400 mb-1">
									Model
								</label>
								<select
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
