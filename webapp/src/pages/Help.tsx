import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";

export default function HelpPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-3xl pb-8 overflow-y-auto h-full">
      <div className="mb-6 flex items-center gap-2">
        <HelpCircle className="text-amber-400" size={22} />
        <h1 className="text-xl font-semibold text-zinc-100">Help</h1>
      </div>

      <div className="space-y-6 text-sm text-zinc-300 leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-zinc-100 mb-2">Overview</h2>
          <p>
            butterchurn-mcp hosts a MilkDrop-style WebGL visualizer using the butterchurn library. It runs 500+ presets
            with a synthetic beat generator synced to BPM. Companion to mixx-dj-mcp for DJ set visuals.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-100 mb-2">Preset browser</h2>
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>Open Presets in the sidebar for search, author filter, grid, favorites</li>
            <li>Click a card to preview live in the hero strip; Demo button auto-cycles every 8s</li>
            <li>Fullscreen opens the Visualizer with your selection</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-100 mb-2">Visualizer controls</h2>
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>Click the canvas or press → to next preset</li>
            <li>← for previous preset</li>
            <li>BPM overlay top-left; preset name fades at bottom</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-100 mb-2">Ports</h2>
          <ul className="font-mono text-xs text-zinc-400 space-y-1">
            <li>Backend (FastAPI + MCP): 10878</li>
            <li>Frontend (Vite dev): 10879</li>
            <li>MCP HTTP: http://127.0.0.1:10878/mcp</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-100 mb-2">API</h2>
          <ul className="font-mono text-xs text-zinc-400 space-y-1">
            <li>GET /api/health — server status</li>
            <li>GET /api/bpm — current BPM</li>
            <li>POST /api/bpm {"{ \"bpm\": 140 }"} — set BPM</li>
            <li>GET /api/capabilities — fleet capability introspection</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-zinc-100 mb-2">Launch</h2>
          <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-400 overflow-x-auto">
            {`just serve   # backend :10878\njust web     # frontend :10879\n# or: .\\start.ps1`}
          </pre>
        </section>
      </div>
    </motion.div>
  );
}
