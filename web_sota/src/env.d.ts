declare module "butterchurn" {
  interface Visualizer {
    render(): void;
    setAudioAnalyzer(analyser: AnalyserNode): void;
    connectAudio(node: AudioNode): void;
    loadPreset(preset: unknown, transitionTime: number): void;
    launchSongTitle(title: string): void;
    setRendererSize(width: number, height: number): void;
  }
  interface ButterchurnOpts {
    width: number;
    height: number;
    pixelRatio: number;
    textureRatio: number;
  }
  export function createVisualizer(canvas: HTMLCanvasElement, opts: ButterchurnOpts): Visualizer;
  const def: { createVisualizer: typeof createVisualizer };
  export default def;
}

declare module "butterchurn-presets" {
  interface PresetEntry {
    name?: string;
    [key: string]: unknown;
  }
  export function getPresets(): Record<string, PresetEntry[]>;
  export function getBasePresets(): Record<string, PresetEntry[]>;
  export function getExtraPresets(): Record<string, PresetEntry[]>;
  const def: {
    default: typeof getPresets;
    getPresets: typeof getPresets;
    getBasePresets: typeof getBasePresets;
    getExtraPresets: typeof getExtraPresets;
  };
  export default def;
}
