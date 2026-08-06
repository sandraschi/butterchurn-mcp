import { useEffect, useRef, useState } from "react";
import { usePresetCanvas } from "../hooks/usePresetCanvas";
import type { PresetEntry } from "../lib/presets";

export default function PresetPreview({
  preset,
  className = "",
  transitionSec = 1.5,
  active = true,
}: {
  preset: PresetEntry | null;
  className?: string;
  transitionSec?: number;
  active?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 640, height: 360 });

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
    transitionSec,
    active,
  });

  return (
    <div ref={wrapRef} className={`relative bg-black overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full block" width={size.width} height={size.height} />
      {!preset && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">Select a preset</div>
      )}
    </div>
  );
}
