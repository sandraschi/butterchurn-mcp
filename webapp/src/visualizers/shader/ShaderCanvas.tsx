import { useEffect, useRef, useState } from "react";
import { useAudioEngine } from "../audio/useAudioEngine";
import {
  createShaderProgram,
  getUniforms,
  initFullscreenQuad,
  type ShaderUniforms,
} from "./gl";
import { getShaderScene } from "./scenes";

interface Props {
  sceneId: string;
  className?: string;
  active?: boolean;
}

export default function ShaderCanvas({ sceneId, className = "", active = true }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  const levels = useAudioEngine(active);
  const levelsRef = useRef(levels);
  levelsRef.current = levels;

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false });
    if (!gl) {
      setError("WebGL2 not available");
      return;
    }

    const scene = getShaderScene(sceneId);
    const program = createShaderProgram(gl, scene.fragment);
    if (!program) {
      setError("Shader compile failed — see console");
      return;
    }
    setError("");
    gl.useProgram(program);
    initFullscreenQuad(gl, program);
    const uniforms: ShaderUniforms = getUniforms(gl, program);

    let raf = 0;
    const t0 = performance.now();

    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth ?? 640;
      const h = parent?.clientHeight ?? 360;
      canvas.width = Math.max(16, Math.floor(w * Math.min(devicePixelRatio, 1.5)));
      canvas.height = Math.max(16, Math.floor(h * Math.min(devicePixelRatio, 1.5)));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement ?? canvas);

    const render = () => {
      const lv = levelsRef.current;
      const t = (performance.now() - t0) / 1000;
      gl.useProgram(program);
      if (uniforms.u_time) gl.uniform1f(uniforms.u_time, t);
      if (uniforms.u_resolution) gl.uniform2f(uniforms.u_resolution, canvas.width, canvas.height);
      if (uniforms.u_bass) gl.uniform1f(uniforms.u_bass, lv.bass);
      if (uniforms.u_mid) gl.uniform1f(uniforms.u_mid, lv.mid);
      if (uniforms.u_high) gl.uniform1f(uniforms.u_high, lv.high);
      if (uniforms.u_bpm) gl.uniform1f(uniforms.u_bpm, lv.bpm);
      if (uniforms.u_beat) gl.uniform1f(uniforms.u_beat, lv.beat);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteProgram(program);
    };
  }, [sceneId, active]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-zinc-950 text-red-400 text-sm ${className}`}>
        {error}
      </div>
    );
  }

  return <canvas ref={canvasRef} className={`block w-full h-full ${className}`} />;
}
