import clsx from "clsx";
import { motion } from "framer-motion";
import { Box, ExternalLink, Search, Sparkles, Waves } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PresetPreview from "../components/PresetPreview";
import ShaderCanvas from "../visualizers/shader/ShaderCanvas";
import { listShaderScenes } from "../visualizers/shader/scenes";
import {
  loadLastEngine,
  loadLastScene,
  saveLastEngine,
  saveLastScene,
  VISUALIZER_ENGINES,
} from "../visualizers/registry";
import type { VisualizerEngineId } from "../visualizers/types";
import { usePresets } from "../lib/PresetsContext";
import { presetGradient, type PresetEntry } from "../lib/presets";

function SceneCard({
  name,
  description,
  gradient,
  selected,
  onSelect,
}: {
  name: string;
  description: string;
  gradient: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "text-left rounded-xl border overflow-hidden transition-all hover:scale-[1.02]",
        selected ? "border-cyan-400 ring-2 ring-cyan-400/40" : "border-zinc-800 hover:border-zinc-600",
      )}
    >
      <div className="aspect-video relative" style={{ background: gradient }}>
        {selected && (
          <span className="absolute bottom-2 left-2 text-[10px] font-bold uppercase bg-cyan-400 text-black px-2 py-0.5 rounded">
            Live
          </span>
        )}
      </div>
      <div className="p-2.5 bg-zinc-900">
        <p className="text-xs font-medium text-zinc-200">{name}</p>
        <p className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2">{description}</p>
      </div>
    </button>
  );
}

export default function ToolboxPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { presets, loading: presetsLoading } = usePresets();

  const engine = (searchParams.get("engine") as VisualizerEngineId) || loadLastEngine();
  const [shaderScene, setShaderScene] = useState(
    () => searchParams.get("scene") || loadLastScene("shader") || listShaderScenes()[0]?.id || "gyroid-pulse",
  );
  const [butterchurnIdx, setButterchurnIdx] = useState(
    () => Number(searchParams.get("i")) || Number(loadLastScene("butterchurn")) || 0,
  );
  const [query, setQuery] = useState("");

  useEffect(() => {
    saveLastEngine(engine);
  }, [engine]);

  useEffect(() => {
    if (engine === "shader") saveLastScene("shader", shaderScene);
    if (engine === "butterchurn") saveLastScene("butterchurn", String(butterchurnIdx));
  }, [engine, shaderScene, butterchurnIdx]);

  const setEngine = useCallback(
    (id: VisualizerEngineId) => {
      setSearchParams({ engine: id });
    },
    [setSearchParams],
  );

  const shaderScenes = useMemo(() => listShaderScenes(), []);
  const filteredShaders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shaderScenes;
    return shaderScenes.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.includes(q)),
    );
  }, [shaderScenes, query]);

  const filteredPresets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return presets.slice(0, 48);
    return presets.filter((p) => p.name.toLowerCase().includes(q) || p.author.toLowerCase().includes(q)).slice(0, 48);
  }, [presets, query]);

  const butterchurnPreset =
    presets.find((p) => p.index === butterchurnIdx) ?? presets[0] ?? null;

  const fullscreenHref =
    engine === "shader"
      ? `/visualizer?engine=shader&scene=${shaderScene}`
      : `/visualizer?engine=butterchurn&i=${butterchurnIdx}`;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="shrink-0 border-b border-zinc-800">
        <div className="px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Box size={18} className="text-cyan-400" />
            <h1 className="text-lg font-semibold text-zinc-100">Visualizer toolbox</h1>
          </div>

          <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
            {VISUALIZER_ENGINES.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setEngine(e.id)}
                className={clsx(
                  "px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors",
                  engine === e.id
                    ? e.era === "modern"
                      ? "bg-cyan-600 text-white"
                      : "bg-amber-600 text-white"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800",
                )}
              >
                {e.era === "modern" ? <Sparkles size={12} /> : <Waves size={12} />}
                {e.name}
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-[180px] max-w-sm relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={engine === "shader" ? "Search shaders…" : "Search MilkDrop presets…"}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-zinc-700 bg-zinc-900 text-sm text-zinc-100"
            />
          </div>

          <Link
            to={fullscreenHref}
            className="h-9 px-3 rounded-lg text-sm flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
          >
            <ExternalLink size={14} />
            Fullscreen
          </Link>
        </div>

        <div className="h-48 sm:h-56 lg:h-64 border-t border-zinc-800 bg-black">
          {engine === "shader" ? (
            <ShaderCanvas sceneId={shaderScene} className="h-full w-full" />
          ) : butterchurnPreset ? (
            <PresetPreview preset={butterchurnPreset} className="h-full w-full" />
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
              {presetsLoading ? "Loading presets…" : "No preset selected"}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {engine === "shader" && (
          <>
            <p className="text-xs text-zinc-500 mb-3">
              WebGL2 GLSL — uniforms: time, bass, mid, high, BPM, beat. Zero MilkDrop baggage.
            </p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
            >
              {filteredShaders.map((s) => (
                <SceneCard
                  key={s.id}
                  name={s.name}
                  description={s.description}
                  gradient={s.gradient}
                  selected={shaderScene === s.id}
                  onSelect={() => setShaderScene(s.id)}
                />
              ))}
            </motion.div>
          </>
        )}

        {engine === "butterchurn" && (
          <>
            <p className="text-xs text-zinc-500 mb-3 flex items-center justify-between">
              <span>MilkDrop preset pack — legacy community shaders</span>
              <Link to="/presets" className="text-amber-400 hover:underline">
                Full browser →
              </Link>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {filteredPresets.map((p: PresetEntry) => (
                <button
                  key={p.index}
                  type="button"
                  onClick={() => setButterchurnIdx(p.index)}
                  className={clsx(
                    "text-left rounded-xl border overflow-hidden transition-all hover:scale-[1.02]",
                    butterchurnIdx === p.index
                      ? "border-amber-400 ring-2 ring-amber-400/40"
                      : "border-zinc-800 hover:border-zinc-600",
                  )}
                >
                  <div className="aspect-video" style={{ background: presetGradient(p.name) }} />
                  <div className="p-2 bg-zinc-900">
                    <p className="text-[10px] text-zinc-300 line-clamp-2">{p.name}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
