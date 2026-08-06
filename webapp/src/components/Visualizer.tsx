import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Mic, Volume2, Radio, Monitor } from "lucide-react";
import { usePresetCanvas, type AudioInput } from "../hooks/usePresetCanvas";
import { loadLastPresetIndex, saveLastPresetIndex } from "../lib/presets";
import { usePresets } from "../lib/PresetsContext";

const BPM_POLL_INTERVAL = 2000;
const OVERLAY_FADE_MS = 2000;

async function fetchBpm(): Promise<number> {
  try {
    const r = await fetch("/api/bpm");
    if (!r.ok) return 128;
    const data = await r.json();
    return data.bpm ?? 128;
  } catch {
    return 128;
  }
}

export default function Visualizer() {
  const { presets, loading } = usePresets();
  const [searchParams] = useSearchParams();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [presetIdx, setPresetIdx] = useState(() => {
    const fromUrl = Number(searchParams.get("i"));
    if (Number.isFinite(fromUrl)) return fromUrl;
    return loadLastPresetIndex();
  });
  const [overlay, setOverlay] = useState("");
  const [bpmDisplay, setBpmDisplay] = useState(128);
  const [audioInput, setAudioInput] = useState<AudioInput>("beat");
  const [audioUrl, setAudioUrl] = useState(() => localStorage.getItem("viz:audioUrl") || "");
  const [audioError, setAudioError] = useState<string | null>(null);
  const bpmRef = useRef(128);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const preset = presets.find((p) => p.index === presetIdx) ?? presets[0] ?? null;

  useEffect(() => {
    const fromUrl = Number(searchParams.get("i"));
    if (Number.isFinite(fromUrl)) setPresetIdx(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width: Math.max(16, Math.floor(width)), height: Math.max(16, Math.floor(height)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const canvasRef = usePresetCanvas({
    preset,
    width: size.width,
    height: size.height,
    transitionSec: 2,
    active: !loading && !!preset,
    audioInput,
    audioUrl,
    onAudioError: setAudioError,
  });

  const showOverlay = useCallback((text: string) => {
    setOverlay(text);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => setOverlay(""), OVERLAY_FADE_MS);
  }, []);

  useEffect(() => {
    if (preset) {
      saveLastPresetIndex(preset.index);
      showOverlay(preset.name);
    }
  }, [preset, showOverlay]);

  const nextPreset = useCallback(() => {
    const pos = presets.findIndex((p) => p.index === presetIdx);
    const next = presets[(pos + 1) % presets.length];
    if (next) setPresetIdx(next.index);
  }, [presets, presetIdx]);

  const prevPreset = useCallback(() => {
    const pos = presets.findIndex((p) => p.index === presetIdx);
    const prev = presets[(pos - 1 + presets.length) % presets.length];
    if (prev) setPresetIdx(prev.index);
  }, [presets, presetIdx]);

  const posInList = presets.findIndex((p) => p.index === presetIdx);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") nextPreset();
      if (e.key === "ArrowLeft") prevPreset();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nextPreset, prevPreset]);

  useEffect(() => {
    const poll = async () => {
      const bpm = await fetchBpm();
      if (bpm !== bpmRef.current) {
        bpmRef.current = bpm;
        setBpmDisplay(bpm);
      }
    };
    poll();
    const id = setInterval(poll, BPM_POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-black text-zinc-500 text-sm">
        Loading presets…
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative w-full h-full bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-pointer"
        width={size.width}
        height={size.height}
        onClick={nextPreset}
      />
      <div className="absolute top-4 left-4 pointer-events-none select-none space-y-1.5">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-mono text-white/90">
          <span className="text-amber-400">♥</span> {bpmDisplay} BPM
        </div>
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => { setAudioInput((v) => (v === "beat" ? "mic" : "beat")); setAudioError(null); }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              audioInput === "mic"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-black/60 text-zinc-300 hover:bg-black/80 border border-transparent"
            }`}
            title={audioInput === "mic" ? "Using microphone" : "Use microphone"}
          >
            {audioInput === "mic" ? <Mic size={12} className="animate-pulse" /> : <Volume2 size={12} />}
            {audioInput === "mic" ? "Mic live" : "Mic"}
          </button>
          <button
            type="button"
            onClick={async () => {
              setAudioError(null);
              setAudioInput("desktop");
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              audioInput === "desktop"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-black/60 text-zinc-300 hover:bg-black/80 border border-transparent"
            }`}
            title="Share screen/audio"
          >
            <Monitor size={12} />
            Desktop
          </button>
          {audioInput !== "url" ? (
            <button
              type="button"
              onClick={() => { setAudioInput("url"); setAudioError(null); }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-black/60 text-zinc-300 hover:bg-black/80 transition-colors"
              title="Stream from URL"
            >
              <Radio size={12} />
              Stream
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="Paste audio URL…"
                className="w-48 h-7 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-100 placeholder:text-zinc-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && audioUrl.trim()) {
                    localStorage.setItem("viz:audioUrl", audioUrl.trim());
                    setAudioInput("url");
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (audioUrl.trim()) {
                    localStorage.setItem("viz:audioUrl", audioUrl.trim());
                    setAudioInput("url");
                    setAudioError(null);
                  }
                }}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-500 text-white transition-colors"
              >
                <Radio size={11} />
                Connect
              </button>
              <button
                type="button"
                onClick={() => setAudioInput("beat")}
                className="rounded-lg px-2 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
            </div>
          )}
          <Link
            to="/toolbox"
            className="inline-block bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-amber-300 hover:text-amber-200"
          >
            ← Toolbox
          </Link>
        </div>
        {audioInput !== "beat" && (
          <div className="bg-emerald-900/40 backdrop-blur-sm rounded-lg px-3 py-1 text-[10px] text-emerald-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {audioInput === "mic" ? "Microphone" : audioInput === "desktop" ? "Desktop audio" : "Streaming"} — click Beat to reset
          </div>
        )}
        {audioError && (
          <div className="bg-red-900/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-red-300">
            {audioError}
          </div>
        )}
      </div>
      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-opacity duration-500 pointer-events-none ${
          overlay ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="bg-black/70 backdrop-blur-md rounded-xl px-6 py-3 text-center max-w-lg">
          <p className="text-white text-lg font-medium tracking-wide">{overlay}</p>
          <p className="text-white/40 text-xs mt-0.5">Click or ← → · {posInList + 1} of {presets.length}</p>
        </div>
      </div>
    </div>
  );
}
