export type VisualizerEngineId = "butterchurn" | "shader";

export interface VisualizerScene {
  id: string;
  name: string;
  description: string;
  author: string;
  tags: string[];
  gradient: string;
}

export interface VisualizerEngine {
  id: VisualizerEngineId;
  name: string;
  description: string;
  era: "legacy" | "modern";
  sceneCount?: number;
  route: string;
}

export interface AudioLevels {
  bass: number;
  mid: number;
  high: number;
  beat: number;
  bpm: number;
}
