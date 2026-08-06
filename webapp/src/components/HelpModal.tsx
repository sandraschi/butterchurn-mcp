import { ExternalLink, X } from "lucide-react";

const HELP_ITEMS = [
  {
    title: "README",
    desc: "Install, ports, mixx-dj integration",
    href: "https://github.com/sandraschi/butterchurn-mcp/blob/main/README.md",
  },
  {
    title: "Visualizer",
    desc: "Click or arrow keys to cycle 500+ MilkDrop presets",
  },
  {
    title: "BPM sync",
    desc: "POST /api/bpm from mixx-dj-mcp or Settings page (60–200)",
  },
  {
    title: "MCP tools",
    desc: "get_bpm, set_bpm — atomic tools on /mcp",
  },
  {
    title: "Ports",
    desc: "Backend 11124 · Frontend 11125",
  },
];

export default function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-[90vw] max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 sticky top-0 bg-zinc-900">
          <h2 className="text-lg font-semibold text-zinc-100">Help</h2>
          <button onClick={onClose} className="p-1.5 rounded text-zinc-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {HELP_ITEMS.map((item) => (
            <div key={item.title} className="border-b border-zinc-800 pb-3 last:border-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-zinc-200">{item.title}</h3>
                {item.href && (
                  <a href={item.href} target="_blank" rel="noreferrer" className="text-amber-400 hover:text-amber-300">
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <p className="text-sm text-zinc-500 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
