import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";

const qc = new QueryClient();

function Inner() {
  const { data, isLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: () => fetch("/api/skills").then((r) => r.json()),
  });

  const skills: { name: string; content: string }[] = data?.skills ?? [];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-4xl pb-8 overflow-y-auto h-full">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Skills</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Agent skills bundled with this server</p>
      </div>

      {isLoading && <p className="text-sm text-zinc-500">Loading…</p>}

      {skills.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
          <BookOpen size={32} className="mb-3 opacity-40" />
          <p className="text-sm mb-4">No skills registered by this server yet</p>
          <div className="max-w-md text-xs text-zinc-600 space-y-2">
            <p>This server provides MilkDrop visualization tools over MCP. The following tools are available:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><span className="text-zinc-400 font-mono">get_bpm</span> — Read current BPM</li>
              <li><span className="text-zinc-400 font-mono">set_bpm</span> — Set BPM for sync</li>
              <li><span className="text-zinc-400 font-mono">list_presets</span> — Browse MilkDrop presets</li>
              <li><span className="text-zinc-400 font-mono">load_preset</span> — Activate a preset</li>
              <li><span className="text-zinc-400 font-mono">list_visualizers</span> — List available engines</li>
            </ul>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {skills.map((s) => (
          <div key={s.name} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <h2 className="font-mono text-amber-300 text-sm mb-2">{s.name}</h2>
            <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-sans">{s.content.slice(0, 500)}…</pre>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function Skills() {
  return (
    <QueryClientProvider client={qc}>
      <Inner />
    </QueryClientProvider>
  );
}
