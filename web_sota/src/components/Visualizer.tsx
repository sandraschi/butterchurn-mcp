import { useCallback, useEffect, useRef, useState } from "react";

const BPM_POLL_INTERVAL = 2000;
const FPS_SAMPLE_INTERVAL = 1000;
const OVERLAY_FADE_MS = 2000;
const PRESET_TRANSITION_S = 2.0;

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

function createBeatBuffer(ctx: AudioContext, bpm: number, durSec = 4): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * durSec;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  const samplesPerBeat = Math.round((60 / bpm) * sampleRate);
  for (let i = 0; i < length; i++) {
    const beatPhase = (i % samplesPerBeat) / samplesPerBeat;
    const envelope = Math.exp(-beatPhase * 6);
    data[i] = (Math.random() * 2 - 1) * envelope * 0.8;
  }
  return buffer;
}

interface PresetEntry {
  name: string;
  preset: Record<string, unknown>;
}

function flattenPresets(presetsMap: Record<string, Record<string, unknown>[]>): PresetEntry[] {
  const result: PresetEntry[] = [];
  for (const [category, list] of Object.entries(presetsMap)) {
    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      const rawName = entry?.name;
      const name = typeof rawName === "string" ? rawName : `${category} #${i + 1}`;
      result.push({ name, preset: entry });
    }
  }
  return result;
}

export default function Visualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visRef = useRef<any>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const presetsRef = useRef<PresetEntry[]>([]);
  const presetIdxRef = useRef(0);
  const bpmRef = useRef(128);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [overlay, setOverlay] = useState("");
  const [bpmDisplay, setBpmDisplay] = useState(128);
  const [fps, setFps] = useState(0);

  const showOverlay = useCallback((text: string) => {
    setOverlay(text);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    overlayTimerRef.current = setTimeout(() => setOverlay(""), OVERLAY_FADE_MS);
  }, []);

  const loadPreset = useCallback((idx: number) => {
    const presets = presetsRef.current;
    if (!presets.length || !visRef.current) return;
    const clamped = ((idx % presets.length) + presets.length) % presets.length;
    presetIdxRef.current = clamped;
    const entry = presets[clamped];
    visRef.current.loadPreset(entry.preset, PRESET_TRANSITION_S);
    visRef.current.launchSongTitle(entry.name);
    showOverlay(entry.name);
  }, [showOverlay]);

  const nextPreset = useCallback(() => loadPreset(presetIdxRef.current + 1), [loadPreset]);
  const prevPreset = useCallback(() => loadPreset(presetIdxRef.current - 1), [loadPreset]);

  const rebuildBeatAudio = useCallback((bpm: number) => {
    const ctx = ctxRef.current;
    if (!ctx || !analyserRef.current) return;
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      try { sourceRef.current.disconnect(); } catch {}
    }
    const buffer = createBeatBuffer(ctx, bpm);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(analyserRef.current);
    src.start();
    sourceRef.current = src;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const init = async () => {
      const butterchurn = (await import("butterchurn")).default;
      const presetPkg = await import("butterchurn-presets");
      const presetsMap: Record<string, Record<string, unknown>[]> =
        (presetPkg.default as any)?.() ?? (presetPkg as any).getPresets?.() ?? {};
      presetsRef.current = flattenPresets(presetsMap);

      const vis = butterchurn.createVisualizer(canvas, {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: window.devicePixelRatio || 1,
        textureRatio: 1,
      });
      visRef.current = vis;

      const ctx = new AudioContext();
      ctxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyserRef.current = analyser;
      vis.setAudioAnalyzer(analyser);

      rebuildBeatAudio(128);

      if (presetsRef.current.length > 0) {
        vis.loadPreset(presetsRef.current[0].preset, 0);
        vis.launchSongTitle(presetsRef.current[0].name);
        setOverlay(presetsRef.current[0].name);
      }

      let frameCount = 0;
      let lastFpsTime = performance.now();

      const render = () => {
        vis.render();
        frameCount++;
        const now = performance.now();
        if (now - lastFpsTime >= FPS_SAMPLE_INTERVAL) {
          setFps(Math.round((frameCount * 1000) / (now - lastFpsTime)));
          frameCount = 0;
          lastFpsTime = now;
        }
        rafRef.current = requestAnimationFrame(render);
      };
      rafRef.current = requestAnimationFrame(render);
    };
    init();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch {}
      }
      if (ctxRef.current) ctxRef.current.close();
    };
  }, [rebuildBeatAudio]);

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
        rebuildBeatAudio(bpm);
      }
    };
    poll();
    const id = setInterval(poll, BPM_POLL_INTERVAL);
    return () => clearInterval(id);
  }, [rebuildBeatAudio]);

  useEffect(() => {
    const handleResize = () => {
      const vis = visRef.current;
      if (vis) {
        try {
          vis.setRendererSize(window.innerWidth, window.innerHeight);
        } catch {}
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-pointer"
        onClick={nextPreset}
      />
      <div className="absolute top-4 left-4 pointer-events-none select-none">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-mono text-white/90">
          <span className="text-amber-400">♥</span> {bpmDisplay} BPM
        </div>
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-mono text-white/60 mt-1.5">
          {fps} FPS
        </div>
      </div>
      <div
        className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-opacity duration-500 pointer-events-none ${
          overlay ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="bg-black/70 backdrop-blur-md rounded-xl px-6 py-3 text-center">
          <p className="text-white text-lg font-medium tracking-wide">{overlay}</p>
          <p className="text-white/40 text-xs mt-0.5">Click or ← → to change preset</p>
        </div>
      </div>
    </div>
  );
}
