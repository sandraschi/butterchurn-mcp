import LoggerModal from "../components/LoggerModal";

export default function LogsPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-4 border-b border-zinc-800 shrink-0">
        <h1 className="text-xl font-semibold text-zinc-100">Logs</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Server events and BPM changes</p>
      </div>
      <div className="flex-1 min-h-0">
        <LoggerModal open={true} onClose={() => {}} embedded />
      </div>
    </div>
  );
}
