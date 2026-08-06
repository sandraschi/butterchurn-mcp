import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadAllPresets, type PresetEntry } from "./presets";

interface PresetsContextValue {
  presets: PresetEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const PresetsContext = createContext<PresetsContextValue | null>(null);

export function PresetsProvider({ children }: { children: ReactNode }) {
  const [presets, setPresets] = useState<PresetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPresets(await loadAllPresets());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ presets, loading, error, refresh }),
    [presets, loading, error, refresh],
  );

  return <PresetsContext.Provider value={value}>{children}</PresetsContext.Provider>;
}

export function usePresets(): PresetsContextValue {
  const ctx = useContext(PresetsContext);
  if (!ctx) throw new Error("usePresets must be used within PresetsProvider");
  return ctx;
}
