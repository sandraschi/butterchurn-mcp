import { Link, useSearchParams } from "react-router-dom";
import Visualizer from "../components/Visualizer";
import ShaderCanvas from "../visualizers/shader/ShaderCanvas";
import { getShaderScene } from "../visualizers/shader/scenes";
import { loadLastEngine, loadLastScene } from "../visualizers/registry";
import type { VisualizerEngineId } from "../visualizers/types";
import { useAudioEngine } from "../visualizers/audio/useAudioEngine";

function ShaderFullscreen({ sceneId }: { sceneId: string }) {
  const scene = getShaderScene(sceneId);
  const levels = useAudioEngine(true);

  return (
    <div className="relative w-full h-full bg-black">
      <ShaderCanvas sceneId={sceneId} className="h-full w-full" />
      <div className="absolute top-4 left-4 pointer-events-none space-y-1.5">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-mono text-white/90">
          <span className="text-cyan-400">◆</span> {scene.name}
        </div>
        <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-mono text-white/60">
          {levels.bpm} BPM · GLSL
        </div>
        <Link
          to="/toolbox?engine=shader"
          className="pointer-events-auto inline-block bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs text-cyan-300 hover:text-cyan-200"
        >
          ← Toolbox
        </Link>
      </div>
    </div>
  );
}

export default function VisualizerPage() {
  const [searchParams] = useSearchParams();
  const engine = (searchParams.get("engine") as VisualizerEngineId) || loadLastEngine();

  if (engine === "shader") {
    const sceneId = searchParams.get("scene") || loadLastScene("shader") || "gyroid-pulse";
    return <ShaderFullscreen sceneId={sceneId} />;
  }

  return (
    <div className="h-full w-full bg-black">
      <Visualizer />
    </div>
  );
}
