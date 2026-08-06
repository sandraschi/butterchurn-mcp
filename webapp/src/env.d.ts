declare module "butterchurn" {
  interface Visualizer {
    render(): void;
    connectAudio(node: AudioNode): void;
    disconnectAudio(node: AudioNode): void;
    loadPreset(preset: unknown, transitionTime: number): void;
    launchSongTitleAnim(title: string): void;
    setRendererSize(width: number, height: number): void;
    loadExtraImages(images: Record<string, unknown>): void;
  }
  interface ButterchurnOpts {
    width: number;
    height: number;
    pixelRatio: number;
    textureRatio: number;
  }
  export function createVisualizer(ctx: AudioContext, canvas: HTMLCanvasElement, opts: ButterchurnOpts): Visualizer;
  const def: { createVisualizer: typeof createVisualizer };
  export default def;
}

declare module "butterchurn-presets" {
  function getPresets(): Record<string, unknown>;
  export { getPresets };
  const def: { getPresets: typeof getPresets };
  export default def;
}

declare module "butterchurn-presets/lib/*" {
  function getPresets(): Record<string, unknown>;
  export { getPresets };
  const def: { getPresets: typeof getPresets };
  export default def;
}
