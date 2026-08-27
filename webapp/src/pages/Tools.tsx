import {
	QueryClient,
	QueryClientProvider,
	useQuery,
} from "@tanstack/react-query";
import clsx from "clsx";
import { motion } from "framer-motion";
import { AlertCircle, Terminal, Wrench } from "lucide-react";

const qc = new QueryClient({
	defaultOptions: { queries: { retry: 2, staleTime: 60_000 } },
});

type ToolEntry = { name: string; kind: string; description?: string };

function Inner() {
	const { data, isLoading, error } = useQuery({
		queryKey: ["tools"],
		queryFn: () => fetch("/api/tools").then((r) => r.json()),
	});

	const tools: ToolEntry[] = data?.tools ?? [];

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			className="p-6 max-w-4xl pb-8"
		>
			<div className="mb-6">
				<h1 className="text-xl font-semibold text-zinc-100">Tools</h1>
				<p className="text-sm text-zinc-500 mt-0.5">
					MCP tools registered on butterchurn-mcp
				</p>
			</div>

			{error && (
				<div className="flex items-center gap-3 p-4 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-200 mb-4">
					<AlertCircle className="w-5 h-5 shrink-0" />
					<p className="text-sm">Failed to load tools from /api/tools</p>
				</div>
			)}

			{isLoading && <p className="text-sm text-zinc-500">Loading tools…</p>}

			<div className="space-y-4">
				{tools.map((t) => (
					<div
						key={t.name}
						className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
					>
						<div className="flex items-start gap-3">
							<Terminal size={20} className="text-amber-400 shrink-0 mt-0.5" />
							<div>
								<div className="flex items-center gap-2">
									<span className="font-mono text-sm text-amber-300">
										{t.name}
									</span>
									<span className="text-xs px-2 py-0.5 rounded bg-zinc-700/50 text-zinc-400">
										{t.kind}
									</span>
								</div>
								{t.description && (
									<p className="text-sm text-zinc-500 mt-1">{t.description}</p>
								)}
							</div>
						</div>
					</div>
				))}
			</div>

			<p className="text-xs text-zinc-600 mt-6 font-mono flex items-center gap-1">
				<Wrench size={12} /> MCP HTTP: http://127.0.0.1:10878/mcp
			</p>
		</motion.div>
	);
}

export default function Tools() {
	return (
		<QueryClientProvider client={qc}>
			<Inner />
		</QueryClientProvider>
	);
}
