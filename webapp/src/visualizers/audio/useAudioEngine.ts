import { useEffect, useRef, useState } from "react";
import type { AudioLevels } from "../types";

const BPM_POLL = 2000;

async function fetchBpm(): Promise<number> {
  try {
    const r = await fetch("/api/bpm");
    if (!r.ok) return 128;
    const d = await r.json();
    return d.bpm ?? 128;
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
    data[i] = (Math.random() * 2 - 1) * envelope * 0.85;
  }
  return buffer;
}

export function useAudioEngine(active: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const freqRef = useRef<Uint8Array | null>(null);
  const bpmRef = useRef(128);
  const [levels, setLevels] = useState<AudioLevels>({
    bass: 0,
    mid: 0,
    high: 0,
    beat: 0,
    bpm: 128,
  });

  const rebuildBeat = (bpm: number) => {
    const ctx = ctxRef.current;
    const analyser = analyserRef.current;
    if (!ctx || !analyser) return;
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {}
      try {
        sourceRef.current.disconnect();
      } catch {}
    }
    const src = ctx.createBufferSource();
    src.buffer = createBeatBuffer(ctx, bpm);
    src.loop = true;
    src.connect(analyser);
    src.start();
    sourceRef.current = src;
  };

  useEffect(() => {
    if (!active) return;
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.75;
    analyserRef.current = analyser;
    freqRef.current = new Uint8Array(analyser.frequencyBinCount);
    rebuildBeat(128);

    let raf = 0;
    const tick = () => {
      const freq = freqRef.current;
      const a = analyserRef.current;
      if (freq && a) {
        a.getByteFrequencyData(freq as Uint8Array<ArrayBuffer>);
        const n = freq.length;
        let bass = 0;
        let mid = 0;
        let high = 0;
        const bEnd = Math.floor(n * 0.08);
        const mEnd = Math.floor(n * 0.35);
        for (let i = 0; i < bEnd; i++) bass += freq[i];
        for (let i = bEnd; i < mEnd; i++) mid += freq[i];
        for (let i = mEnd; i < n; i++) high += freq[i];
        bass = bass / bEnd / 255;
        mid = mid / (mEnd - bEnd) / 255;
        high = high / (n - mEnd) / 255;
        const beat = Math.min(1, bass * 1.4);
        setLevels({ bass, mid, high, beat, bpm: bpmRef.current });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const poll = async () => {
      const bpm = await fetchBpm();
      if (bpm !== bpmRef.current) {
        bpmRef.current = bpm;
        rebuildBeat(bpm);
      }
    };
    poll();
    const iv = setInterval(poll, BPM_POLL);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(iv);
      if (sourceRef.current) {
        try {
          sourceRef.current.stop();
        } catch {}
      }
      void ctx.close();
      ctxRef.current = null;
    };
  }, [active]);

  return levels;
}
