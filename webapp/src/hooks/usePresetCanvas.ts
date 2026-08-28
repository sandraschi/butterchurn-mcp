import { useCallback, useEffect, useRef } from "react";
import type { PresetEntry } from "../lib/presets";

const BPM = 128;

// Browsers block AudioContext that starts without a user gesture (autoplay
// policy) - a suspended context produces no audio, so butterchurn renders
// black. Share ONE context and resume it on the first user interaction.
let sharedCtx: AudioContext | null = null;
let resumeBound = false;

function getSharedContext(): AudioContext {
  if (!sharedCtx) {
    sharedCtx = new AudioContext();
  }
  if (!resumeBound) {
    resumeBound = true;
    const resume = () => {
      if (sharedCtx && sharedCtx.state === "suspended") {
        void sharedCtx.resume().catch(() => {});
      }
    };
    for (const evt of ["pointerdown", "keydown", "touchstart", "click"]) {
      window.addEventListener(evt, resume, { once: true });
    }
  }
  return sharedCtx;
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

export type AudioInput = "beat" | "mic" | "url" | "desktop";

interface Options {
  preset: PresetEntry | null;
  width: number;
  height: number;
  transitionSec?: number;
  active?: boolean;
  audioInput?: AudioInput;
  audioUrl?: string;
  onAudioError?: (msg: string) => void;
}

export function usePresetCanvas({ preset, width, height, transitionSec = 1.5, active = true, audioInput = "beat", audioUrl = "", onAudioError }: Options) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visRef = useRef<any>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioNode | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef(0);
  const readyRef = useRef(false);

  const connectBeat = useCallback((ctx: AudioContext, vis: any) => {
    const buffer = createBeatBuffer(ctx, BPM);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.start();
    sourceRef.current = src;
    vis.connectAudio(src);
  }, []);

  const connectMic = useCallback(async (ctx: AudioContext, vis: any) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micRef.current = stream;
      const src = ctx.createMediaStreamSource(stream);
      sourceRef.current = src;
      vis.connectAudio(src);
    } catch (err) {
      onAudioError?.(err instanceof Error ? err.message : "Mic access denied");
    }
  }, [onAudioError]);

  const connectUrl = useCallback(async (ctx: AudioContext, vis: any, url: string) => {
    try {
      const audio = new Audio(url);
      audio.crossOrigin = "anonymous";
      audio.loop = true;
      audioElRef.current = audio;
      const src = ctx.createMediaElementSource(audio);
      sourceRef.current = src;
      vis.connectAudio(src);
      await audio.play();
    } catch (err) {
      onAudioError?.(err instanceof Error ? err.message : "Failed to play audio URL");
    }
  }, [onAudioError]);

  const connectDesktop = useCallback(async (ctx: AudioContext, vis: any) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        audio: true,
        video: false,
      });
      micRef.current = stream;
      const src = ctx.createMediaStreamSource(stream);
      sourceRef.current = src;
      vis.connectAudio(src);
    } catch (err) {
      onAudioError?.(err instanceof Error ? err.message : "Desktop audio cancelled/denied");
    }
  }, [onAudioError]);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas || width < 16 || height < 16) return;

    let cancelled = false;

    const init = async () => {
      const butterchurn = (await import("butterchurn")).default;
      if (cancelled) return;

      const ctx = getSharedContext();
      ctxRef.current = ctx;

      const vis = butterchurn.createVisualizer(ctx, canvas, {
        width,
        height,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
        textureRatio: 1,
      });
      visRef.current = vis;
      readyRef.current = true;

      if (audioInput === "beat") connectBeat(ctx, vis);
      else if (audioInput === "mic") await connectMic(ctx, vis);
      else if (audioInput === "desktop") await connectDesktop(ctx, vis);
      else if (audioInput === "url" && audioUrl) await connectUrl(ctx, vis, audioUrl);

      if (preset) {
        vis.loadPreset(preset.preset, 0);
        try { vis.launchSongTitleAnim(preset.name); } catch {}
      }

      const render = () => {
        if (cancelled) return;
        vis.render();
        rafRef.current = requestAnimationFrame(render);
      };
      rafRef.current = requestAnimationFrame(render);
    };

    void init();

    return () => {
      cancelled = true;
      readyRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current.src = ""; audioElRef.current = null; }
      if (micRef.current) { micRef.current.getTracks().forEach((t) => t.stop()); micRef.current = null; }
      if (sourceRef.current) {
        try {
          if ("stop" in sourceRef.current && typeof (sourceRef.current as AudioScheduledSourceNode).stop === "function") {
            (sourceRef.current as AudioScheduledSourceNode).stop();
          }
        } catch {}
      }
      // NOTE: do NOT close ctxRef - it's a shared, app-lifetime AudioContext.
      visRef.current = null;
    };
  }, [active, width, height, audioInput, audioUrl, connectBeat, connectMic, connectUrl, connectDesktop, onAudioError]);

  useEffect(() => {
    const vis = visRef.current;
    if (!vis || !preset || !readyRef.current) return;
    try {
      vis.setRendererSize(width, height);
      vis.loadPreset(preset.preset, transitionSec);
      vis.launchSongTitleAnim(preset.name);
    } catch {}
  }, [preset, width, height, transitionSec]);

  return canvasRef;
}
