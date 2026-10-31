import type { LoadedModel } from "../lib/llm";

export interface VramGpu {
  index: number;
  name: string;
  total_mb: number;
  used_mb: number;
  free_mb: number;
}

function gb(mb: number): string {
  return `${(mb / 1024).toFixed(1)} GB`;
}

function barClass(pct: number): string {
  if (pct >= 90) return "from-red-500 to-red-400";
  if (pct >= 70) return "from-amber-500 to-amber-400";
  return "from-emerald-500 to-emerald-400";
}

/**
 * Per-GPU VRAM telemetry as gradient bars + resident-model chips.
 * Empty (no nvidia-smi) renders the honest fallback line, never fake zeros.
 */
export function GpuVramBars({
  gpus,
  loaded,
}: {
  gpus: VramGpu[];
  loaded: LoadedModel[];
}) {
  if (gpus.length === 0) {
    return (
      <p className="text-xs text-zinc-500" data-testid="llm-vram">
        No GPU telemetry (nvidia-smi unavailable).
      </p>
    );
  }
  return (
    <div className="space-y-2" data-testid="llm-vram">
      {gpus.map((g) => {
        const pct =
          g.total_mb > 0
            ? Math.min(100, Math.round((g.used_mb / g.total_mb) * 100))
            : 0;
        return (
          <div key={g.index} className="space-y-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-zinc-400 truncate">
                GPU {g.index} · {g.name}
              </span>
              <span className="font-mono text-zinc-500 shrink-0 ml-2">
                {gb(g.used_mb)} / {gb(g.total_mb)} · {pct}%
              </span>
            </div>
            <div
              className="h-1.5 rounded-full bg-zinc-800 overflow-hidden"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`GPU ${g.index} VRAM ${pct}% used`}
            >
              <div
                className={`h-full rounded-full bg-gradient-to-r ${barClass(pct)} transition-[width] duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      <div
        className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500"
        data-testid="llm-loaded"
      >
        <span>Loaded:</span>
        {loaded.length > 0 ? (
          loaded.map((m) => (
            <span
              key={m.name}
              className="rounded bg-zinc-800 border border-zinc-700 px-1.5 py-0.5 font-mono text-zinc-300"
            >
              {m.name} · {gb(m.size_vram_mb)}
            </span>
          ))
        ) : (
          <span>None loaded — VRAM free.</span>
        )}
      </div>
    </div>
  );
}
