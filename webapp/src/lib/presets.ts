export interface PresetEntry {
  name: string;
  author: string;
  category: string;
  preset: Record<string, unknown>;
  index: number;
}

let cached: PresetEntry[] | null = null;

function isPresetObject(v: unknown): boolean {
  return typeof v === "object" && v !== null && ("baseVals" in v || "shapes" in v || "waves" in v);
}

export function extractAuthor(name: string): string {
  const head = name.split(" - ")[0]?.trim() ?? name;
  const plus = head.split("+")[0]?.trim();
  const comma = plus.split(",")[0]?.trim();
  return comma || "Unknown";
}

function hashHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function presetGradient(name: string): string {
  const h = hashHue(name);
  return `linear-gradient(135deg, hsl(${h} 70% 35%) 0%, hsl(${(h + 60) % 360} 60% 18%) 100%)`;
}

function extractPresets(mod: Record<string, unknown>): Record<string, unknown> {
  const defaultExport = mod.default;
  let raw: unknown;
  if (typeof mod.getPresets === "function") {
    raw = (mod.getPresets as () => Record<string, unknown>)();
  } else if (
    defaultExport !== null &&
    typeof defaultExport === "function" &&
    typeof (defaultExport as unknown as Record<string, unknown>).getPresets === "function"
  ) {
    raw = ((defaultExport as unknown as Record<string, unknown>).getPresets as () => Record<string, unknown>)();
  } else if (typeof defaultExport === "function") {
    raw = (defaultExport as () => unknown)();
  } else {
    raw = (defaultExport ?? {}) as Record<string, unknown>;
  }
  if (typeof raw === "function") raw = (raw as () => unknown)();
  if (!raw || typeof raw !== "object") return {};
  return raw as Record<string, unknown>;
}

function flattenEntries(raw: Record<string, unknown>, category: string): Omit<PresetEntry, "index">[] {
  const entries: Omit<PresetEntry, "index">[] = [];
  for (const [key, val] of Object.entries(raw)) {
    if (Array.isArray(val)) {
      for (let i = 0; i < val.length; i++) {
        const p = val[i];
        if (isPresetObject(p)) {
          const name = typeof (p as { name?: string }).name === "string" ? (p as { name: string }).name : `${key} #${i + 1}`;
          entries.push({ name, author: extractAuthor(name), category, preset: p as Record<string, unknown> });
        }
      }
    } else if (isPresetObject(val)) {
      entries.push({ name: key, author: extractAuthor(key), category, preset: val as Record<string, unknown> });
    }
  }
  return entries;
}

async function loadAllPacks(): Promise<Omit<PresetEntry, "index">[]> {
  const results = await Promise.all([
    (async () => {
      try {
        const m = await import("butterchurn-presets");
        return flattenEntries(extractPresets(m as Record<string, unknown>), "Main");
      } catch { return []; }
    })(),
    (async () => {
      try {
        const m = await import("butterchurn-presets/lib/butterchurnPresetsExtra.min");
        return flattenEntries(extractPresets(m as Record<string, unknown>), "Extra");
      } catch { return []; }
    })(),
    (async () => {
      try {
        const m = await import("butterchurn-presets/lib/butterchurnPresetsExtra2.min");
        return flattenEntries(extractPresets(m as Record<string, unknown>), "Extra 2");
      } catch { return []; }
    })(),
    (async () => {
      try {
        const m = await import("butterchurn-presets/lib/butterchurnPresetsMD1.min");
        return flattenEntries(extractPresets(m as Record<string, unknown>), "MD1");
      } catch { return []; }
    })(),
    (async () => {
      try {
        const m = await import("butterchurn-presets/lib/butterchurnPresetsMinimal.min");
        return flattenEntries(extractPresets(m as Record<string, unknown>), "Minimal");
      } catch { return []; }
    })(),
    (async () => {
      try {
        const m = await import("butterchurn-presets/lib/butterchurnPresetsNonMinimal.min");
        return flattenEntries(extractPresets(m as Record<string, unknown>), "Non-Minimal");
      } catch { return []; }
    })(),
  ]);
  return results.flat();
}

export async function loadAllPresets(): Promise<PresetEntry[]> {
  if (cached) return cached;
  const flat = await loadAllPacks();
  flat.sort((a, b) => a.name.localeCompare(b.name));
  cached = flat.map((e, index) => ({ ...e, index }));
  return cached;
}

export function getAuthors(presets: PresetEntry[]): string[] {
  const counts = new Map<string, number>();
  for (const p of presets) counts.set(p.author, (counts.get(p.author) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([author]) => author);
}

export function getCategories(): string[] {
  return ["Main", "Extra", "Extra 2", "MD1", "Minimal", "Non-Minimal"];
}

const FAV_KEY = "butterchurn:favorites";

export function loadFavorites(): Set<number> {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

export function saveFavorites(favs: Set<number>): void {
  localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
}

const LAST_KEY = "butterchurn:lastPreset";

export function loadLastPresetIndex(): number {
  try {
    const n = Number(localStorage.getItem(LAST_KEY));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function saveLastPresetIndex(index: number): void {
  localStorage.setItem(LAST_KEY, String(index));
}
