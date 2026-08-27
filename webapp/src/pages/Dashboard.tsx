import {
	QueryClient,
	QueryClientProvider,
	useQuery,
} from "@tanstack/react-query";
import clsx from "clsx";
import { motion } from "framer-motion";
import { Activity, Heart, Music2, Server, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useCapabilities } from "../lib/capabilities";
import type { DashboardData } from "../lib/types";

const qc = new QueryClient({
	defaultOptions: { queries: { retry: 2, staleTime: 10_000 } },
});

function StatCard({
	label,
	value,
	icon: Icon,
	color,
}: {
	label: string;
	value: string;
	icon: React.ElementType;
	color: string;
}) {
	return (
		<div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
			<div className="flex items-center gap-2 mb-2">
				<Icon size={16} className={color} />
				<span className="text-sm text-zinc-400">{label}</span>
			</div>
			<div className="text-2xl font-bold text-zinc-100">{value}</div>
		</div>
	);
}

function Inner({ backendOk }: { backendOk: boolean | null }) {
	const { caps, loading: capsLoading } = useCapabilities();
	const { data: dash } = useQuery({
		queryKey: ["dashboard"],
		queryFn: () =>
			fetch("/api/dashboard").then((r) => r.json()) as Promise<DashboardData>,
		refetchInterval: 5_000,
		enabled: backendOk === true,
	});

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			className="p-6 max-w-4xl pb-8 h-full overflow-y-auto"
		>
			<div className="mb-6">
				<h1 className="text-xl font-semibold text-zinc-100">Dashboard</h1>
				<p className="text-sm text-zinc-500 mt-0.5">
					MilkDrop WebGL visualizer — BPM sync for mixx-dj-mcp
				</p>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<StatCard
					label="BPM"
					value={dash ? String(dash.bpm) : "—"}
					icon={Heart}
					color="text-amber-400"
				/>
				<StatCard
					label="Uptime"
					value={dash ? `${Math.round(dash.uptime_seconds)}s` : "—"}
					icon={Activity}
					color="text-emerald-400"
				/>
				<StatCard
					label="Tools"
					value={
						caps ? String(caps.tool_surface.total) : capsLoading ? "…" : "—"
					}
					icon={Server}
					color="text-violet-400"
				/>
				<StatCard
					label="Shader scenes"
					value="6"
					icon={Sparkles}
					color="text-cyan-400"
				/>
				<StatCard
					label="MilkDrop"
					value="500+"
					icon={Music2}
					color="text-amber-400"
				/>
			</div>

			<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-4">
				<h2 className="text-sm font-medium text-zinc-300 mb-3">Quick start</h2>
				<ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
					<li>
						Open{" "}
						<Link to="/toolbox" className="text-cyan-400 hover:underline">
							Toolbox
						</Link>{" "}
						— modern GLSL shaders + MilkDrop presets, pick engine and scene
					</li>
					<li>
						Open the{" "}
						<Link to="/visualizer" className="text-amber-400 hover:underline">
							Visualizer
						</Link>{" "}
						fullscreen — click or arrow keys to cycle
					</li>
					<li>
						Sync BPM from mixx-dj-mcp via POST /api/bpm or the Settings page
					</li>
					<li>MCP tools: get_bpm, set_bpm on http://127.0.0.1:10878/mcp</li>
				</ol>
			</div>

			<div
				className={clsx(
					"rounded-lg border px-4 py-3 text-sm",
					backendOk
						? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
						: "border-red-500/30 bg-red-500/10 text-red-200",
				)}
			>
				{backendOk === null
					? "Checking backend…"
					: backendOk
						? "Backend connected on port 10878"
						: "Backend offline — run just serve"}
			</div>
		</motion.div>
	);
}

export default function Dashboard({
	backendOk,
}: { backendOk: boolean | null }) {
	return (
		<QueryClientProvider client={qc}>
			<Inner backendOk={backendOk} />
		</QueryClientProvider>
	);
}
