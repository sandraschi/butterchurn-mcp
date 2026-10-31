import { motion } from "framer-motion";
import { CheckCircle2, Cpu, HelpCircle, Monitor, XCircle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GpuVramBars } from "../components/GpuVramBars";
import { LlmProviderCards } from "../components/LlmProviderCards";
import {
  fetchGpus,
  fetchLlmSettings,
  fetchLoaded,
  fetchModels,
  fetchProviders,
  type GpuInfo,
  type LoadedModel,
  type ProviderInfo,
  saveLlmSettings,
  saveSelection,
  unloadLlm,
} from "../lib/llm";
import {
  fitsTarget,
  type GpuInfo as PrefGpu,
  pickPreferredModel,
} from "../lib/modelPreference";
import { loadTargetGpuIndex, saveTargetGpuIndex } from "../lib/provider";

function gb(mb: number): string {
  return `${(mb / 1024).toFixed(1)} GB`;
}

export default function SettingsPage() {
  const [bpm, setBpm] = useState(128);
  const [bpmSaved, setBpmSaved] = useState(false);
  const [bpmError, setBpmError] = useState("");

  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState("ollama");
  const [endpoint, setEndpoint] = useState("http://127.0.0.1:11434");
  const [selectedModel, setSelectedModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [modelsSource, setModelsSource] = useState("");
  const [probing, setProbing] = useState(true);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [kicking, setKicking] = useState(false);

  const [gpus, setGpus] = useState<GpuInfo[]>([]);
  const [loaded, setLoaded] = useState<LoadedModel[]>([]);
  const [targetGpuIndex, setTargetGpuIndex] = useState(-1);
  const [gpuDetected, setGpuDetected] = useState(false);
  const [gpuName, setGpuName] = useState("");
  const mountedRef = useRef(true);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      mountedRef.current = false;
      for (const t of timers) clearTimeout(t);
      timers.length = 0;
    };
  }, []);

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

  const refreshLoaded = useCallback(
    async (providerId: string, kind: string | undefined, ep: string) => {
      if (kind !== "local" || providerId !== "ollama") {
        setLoaded([]);
        return;
      }
      try {
        const d = await fetchLoaded(providerId, ep);
        if (mountedRef.current) setLoaded(d.models);
      } catch {
        if (mountedRef.current) setLoaded([]);
      }
    },
    [],
  );

  const refreshTelemetry = useCallback(
    (providerId: string, kind: string | undefined, ep: string) => {
      const tick = async () => {
        try {
          const cards = await fetchGpus();
          if (mountedRef.current && cards.length) setGpus(cards);
        } catch {
          /* keep previous readout */
        }
        await refreshLoaded(providerId, kind, ep);
      };
      void tick();
      timersRef.current.push(
        window.setTimeout(() => void tick(), 2000),
        window.setTimeout(() => void tick(), 5000),
      );
    },
    [refreshLoaded],
  );

  const reloadModels = useCallback(async (id: string) => {
    try {
      const m = await fetchModels(id);
      if (!mountedRef.current) return;
      setModels(m.models);
      setModelsSource(m.source);
      // RULE: never auto-pick. Keep a still-valid choice, else empty.
      setSelectedModel((cur) => (cur && m.models.includes(cur) ? cur : ""));
    } catch {
      if (!mountedRef.current) return;
      setModels([]);
      setModelsSource("none");
    }
  }, []);

  const refreshProviders = useCallback(async () => {
    try {
      const pv = await fetchProviders();
      if (mountedRef.current) setProviders(pv.providers);
    } catch {
      /* keep previous list */
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Backend truth + provider registry + GPU telemetry go out together.
        const [providersRes, settingsRes, gpusRes] = await Promise.allSettled([
          fetchProviders(),
          fetchLlmSettings(),
          fetchGpus(),
        ]);

        if (!mountedRef.current) return;

        let eps: Record<string, string> = {};
        let selId = "ollama";
        if (providersRes.status === "fulfilled") {
          const list = providersRes.value.providers;
          setProviders(list);
          for (const p of list) eps[p.id] = p.base_url;
        }

        if (settingsRes.status === "fulfilled") {
          const s = settingsRes.value;
          if (s.provider) selId = s.provider;
          if (s.endpoint) eps = { ...eps, [selId]: s.endpoint };
          if (s.model) setSelectedModel(s.model);
          // Mirror to localStorage so Chat boots fast even when backend lags.
          try {
            saveSelection(selId, s.model ?? "");
          } catch {}
        } else {
          try {
            const rawP = localStorage.getItem("llm_provider");
            const rawM = localStorage.getItem("llm_model");
            if (rawP) selId = rawP;
            if (rawM) setSelectedModel(rawM);
          } catch {}
        }

        setSelectedProvider(selId);
        setEndpoint(eps[selId] ?? "http://127.0.0.1:11434");

        if (gpusRes.status === "fulfilled") {
          const cards = gpusRes.value;
          setGpus(cards);
          const savedGpu = loadTargetGpuIndex();
          if (cards.length > 0) {
            const target =
              cards.find((g) => g.index === savedGpu) ??
              cards.find((g) => g.index > 0) ??
              cards[0];
            setTargetGpuIndex(target.index);
            setGpuDetected(true);
            const high = cards.find((g) => g.total_mb >= 12288);
            if (high) setGpuName(high.name);
          }
        }

        const kind =
          providersRes.status === "fulfilled"
            ? providersRes.value.providers.find((p) => p.id === selId)?.kind
            : undefined;
        await refreshLoaded(selId, kind, eps[selId] ?? "");
        if (providersRes.status === "fulfilled") {
          try {
            const m = await fetchModels(selId);
            if (!mountedRef.current) return;
            setModels(m.models);
            setModelsSource(m.source);
            // Keep a still-valid saved choice; never fall back to models[0].
            setSelectedModel((cur) =>
              cur && m.models.includes(cur) ? cur : "",
            );
          } catch {
            /* models stay empty */
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("LLM detection failed", err);
      } finally {
        if (mountedRef.current) setProbing(false);
      }
    })();
  }, [refreshLoaded]);

  const handleProviderChange = async (name: string) => {
    setSelectedProvider(name);
    setSelectedModel("");
    setModels([]);
    setModelsSource("");
    setSaveMsg(null);
    const p = providers.find((d) => d.id === name);
    const ep = p?.base_url ?? "";
    setEndpoint(ep);
    await reloadModels(name);
    await refreshLoaded(name, p?.kind, ep);
  };

  const handleCardsChanged = useCallback(
    async (id: string) => {
      await refreshProviders();
      if (id === selectedProvider) await reloadModels(id);
    },
    [refreshProviders, selectedProvider, reloadModels],
  );

  const handleModelChange = (model: string) => {
    setSelectedModel(model);
  };

  const handleSave = async () => {
    setSaveMsg(null);
    try {
      const res = await saveLlmSettings({
        provider: selectedProvider,
        endpoint,
        model: selectedModel,
      });
      saveSelection(selectedProvider, selectedModel);
      try {
        const pv = await fetchProviders();
        setProviders(pv.providers);
      } catch {}
      await reloadModels(selectedProvider);
      const bits = ["Saved."];
      const sw = res.switch;
      if (sw && selectedProvider === "ollama" && selectedModel) {
        if (!sw.engine)
          bits.push("Ollama engine unreachable — start it first.");
        if (sw.evicted.length) bits.push(`Evicted: ${sw.evicted.join(", ")}.`);
        bits.push(
          sw.warmed
            ? `${selectedModel} is loaded.`
            : `Warning: ${selectedModel} did not warm up.`,
        );
      } else if (sw && selectedProvider === "ollama" && !selectedModel) {
        if (sw.evicted.length)
          bits.push(`Evicted: ${sw.evicted.join(", ")}. Selection cleared.`);
        else bits.push("Selection cleared — VRAM free.");
      }
      setSaveMsg(bits.join(" "));
      refreshTelemetry(
        selectedProvider,
        providers.find((p) => p.id === selectedProvider)?.kind,
        endpoint,
      );
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : String(e));
    }
  };

  const handleKickOut = async () => {
    setSaveMsg(null);
    setKicking(true);
    try {
      const res = await unloadLlm({ provider: selectedProvider, endpoint });
      await saveLlmSettings({
        provider: selectedProvider,
        endpoint,
        model: "",
      });
      saveSelection(selectedProvider, "");
      setSelectedModel("");
      const bits = res.evicted.length
        ? [`Kicked out: ${res.evicted.join(", ")}. Selection cleared.`]
        : ["Nothing was loaded. Selection cleared."];
      setSaveMsg(bits.join(" "));
      setLoaded([]);
      refreshTelemetry(
        selectedProvider,
        providers.find((p) => p.id === selectedProvider)?.kind,
        endpoint,
      );
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setKicking(false);
    }
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

  // Target-GPU-aware fit info for the model picker (pure fns, backend data).
  const targetGpu: PrefGpu | null = useMemo(() => {
    const g = gpus.find((x) => x.index === targetGpuIndex) ?? null;
    return g ? { index: g.index, name: g.name, vramMb: g.total_mb } : null;
  }, [gpus, targetGpuIndex]);

  const suggestedModel = useMemo(() => {
    if (selectedModel || models.length === 0) return "";
    return pickPreferredModel(
      loaded.map((m) => m.name),
      models,
      targetGpu,
    );
  }, [selectedModel, models, loaded, targetGpu]);

  const selectedFits =
    !selectedModel || !targetGpu || fitsTarget(selectedModel, targetGpu);

  const detectedLocals = providers.filter(
    (p) => p.kind === "local" && (p.detected ?? p.configured),
  );
  const isLocal =
    providers.find((p) => p.id === selectedProvider)?.kind === "local";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 max-w-2xl pb-8 space-y-8"
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
        ) : detectedLocals.length === 0 ? (
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

        {!probing && gpuDetected && gpuName && detectedLocals.length === 0 && (
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
              {providers
                .filter((p) => p.kind === "local")
                .map((p) => {
                  const on = p.detected ?? p.configured;
                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs ${
                        on
                          ? "bg-emerald-900/30 text-emerald-300"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      {probing ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-pulse" />
                      ) : on ? (
                        <CheckCircle2 size={10} className="text-emerald-400" />
                      ) : (
                        <XCircle size={10} />
                      )}
                      {p.label}
                    </div>
                  );
                })}
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
                  onChange={(e) => void handleProviderChange(e.target.value)}
                  className="w-full h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200"
                  data-testid="llm-provider-select"
                >
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.kind})
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
                {models.length > 0 ? (
                  <select
                    id="llm-model-select"
                    value={selectedModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    className="w-full h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200"
                    data-testid="llm-model-select"
                  >
                    <option value="">No model selected</option>
                    {models.map((m) => {
                      const fits = !targetGpu || fitsTarget(m, targetGpu);
                      return (
                        <option key={m} value={m}>
                          {m}
                          {targetGpu ? (fits ? " (fits)" : " (too big?)") : ""}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    id="llm-model-select"
                    value={selectedModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    placeholder="No models found — install one, then pick it here"
                    aria-label="Model name"
                    className="w-full h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 font-mono"
                    data-testid="llm-model-select"
                  />
                )}
                <p className="text-[10px] text-zinc-600 mt-1">
                  source: {modelsSource}
                  {suggestedModel ? ` · suggested: ${suggestedModel}` : ""}
                </p>
                {selectedModel && !selectedFits && targetGpu && (
                  <p className="text-[11px] text-amber-300 mt-1">
                    {selectedModel} may not fit GPU {targetGpu.index} (
                    {gb(targetGpu.vramMb)}). Save anyway, or pick a smaller
                    model.
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="llm-endpoint"
                  className="block text-xs text-zinc-400 mb-1"
                >
                  Endpoint
                </label>
                <input
                  id="llm-endpoint"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  className="w-full h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200 font-mono"
                  data-testid="llm-endpoint"
                />
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
                        GPU {g.index} - {g.name} ({gb(g.total_mb)})
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

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={probing}
                className="h-9 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-sm text-white font-medium transition-colors"
                data-testid="settings-llm-save"
              >
                Save
              </button>
              {isLocal && selectedProvider === "ollama" && (
                <button
                  type="button"
                  onClick={() => void handleKickOut()}
                  disabled={kicking || probing}
                  className="h-9 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-sm text-zinc-300 transition-colors"
                  data-testid="settings-llm-kick"
                >
                  {kicking ? "Kicking…" : "Kick LLM out"}
                </button>
              )}
              {saveMsg && (
                <span className="text-xs text-zinc-400">{saveMsg}</span>
              )}
            </div>

            {selectedProvider && selectedModel && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-900/20 rounded-lg px-3 py-2">
                <CheckCircle2 size={12} />
                Active: {selectedProvider} / {selectedModel}
              </div>
            )}

            {isLocal && <GpuVramBars gpus={gpus} loaded={loaded} />}
          </div>
        )}
      </section>

      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-amber-400" />
          <h2 className="text-sm font-semibold text-zinc-200">All providers</h2>
        </div>
        <p className="text-xs text-zinc-500">
          Test any engine, paste cloud keys, or install Ollama in one click.
          Saving a key never changes your active selection.
        </p>
        <LlmProviderCards
          providers={providers}
          probing={probing}
          selected={selectedProvider}
          onChanged={handleCardsChanged}
          onUse={(id) => void handleProviderChange(id)}
        />
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
