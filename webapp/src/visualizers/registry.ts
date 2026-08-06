import type { VisualizerEngine, VisualizerEngineId } from "./types";

export const VISUALIZER_ENGINES: VisualizerEngine[] = [
  {
    id: "shader",
    name: "GLSL Shaders",
    description: "WebGL2 fragment shaders — raymarch, gyroid, neon grids. Audio-reactive uniforms.",
    era: "modern",
    route: "/toolbox?engine=shader",
  },
  {
    id: "butterchurn",
    name: "Butterchurn / MilkDrop",
    description: "500+ community MilkDrop presets via butterchurn WebGL.",
    era: "legacy",
    route: "/toolbox?engine=butterchurn",
  },
];

export function getEngine(id: string): VisualizerEngine | undefined {
  return VISUALIZER_ENGINES.find((e) => e.id === id);
}

const ENGINE_KEY = "viz:engine";
const SCENE_KEY = "viz:scene";

export function loadLastEngine(): VisualizerEngineId {
  const v = localStorage.getItem(ENGINE_KEY);
  return v === "butterchurn" || v === "shader" ? v : "shader";
}

export function saveLastEngine(id: VisualizerEngineId): void {
  localStorage.setItem(ENGINE_KEY, id);
}

export function loadLastScene(engine: VisualizerEngineId): string {
  return localStorage.getItem(`${SCENE_KEY}:${engine}`) ?? "";
}

export function saveLastScene(engine: VisualizerEngineId, sceneId: string): void {
  localStorage.setItem(`${SCENE_KEY}:${engine}`, sceneId);
}
