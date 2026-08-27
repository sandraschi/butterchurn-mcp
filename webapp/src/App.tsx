import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
	BookOpen,
	Box,
	ChevronLeft,
	ChevronRight,
	Grid3X3,
	HelpCircle,
	LayoutDashboard,
	MessageSquare,
	Moon,
	Music2,
	Settings,
	Sun,
	Terminal,
	Wrench,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	BrowserRouter,
	NavLink,
	Navigate,
	Route,
	Routes,
} from "react-router-dom";
import HelpModal from "./components/HelpModal";
import LoggerModal from "./components/LoggerModal";
import Chat from "./pages/Chat";
import Dashboard from "./pages/Dashboard";
import HelpPage from "./pages/Help";
import LogsPage from "./pages/Logs";
import PresetsPage from "./pages/PresetsPage";
import SettingsPage from "./pages/Settings";
import Skills from "./pages/Skills";
import ToolboxPage from "./pages/ToolboxPage";
import Tools from "./pages/Tools";
import VisualizerPage from "./pages/VisualizerPage";

const NAV = [
	{ to: "/", label: "Dashboard", icon: LayoutDashboard },
	{ to: "/toolbox", label: "Toolbox", icon: Box },
	{ to: "/presets", label: "Presets", icon: Grid3X3 },
	{ to: "/visualizer", label: "Visualizer", icon: Music2 },
	{ to: "/tools", label: "Tools", icon: Wrench },
	{ to: "/skills", label: "Skills", icon: BookOpen },
	{ to: "/chat", label: "Chat", icon: MessageSquare },
	{ to: "/settings", label: "Settings", icon: Settings },
	{ to: "/logs", label: "Logs", icon: Terminal },
	{ to: "/help", label: "Help", icon: HelpCircle },
];

async function checkBackendHealth(): Promise<boolean> {
	try {
		const r = await fetch("/api/health");
		return r.ok;
	} catch {
		return false;
	}
}

export default function App() {
	const [collapsed, setCollapsed] = useState(false);
	const [backendOk, setBackendOk] = useState<boolean | null>(null);
	const [loggerOpen, setLoggerOpen] = useState(false);
	const [helpOpen, setHelpOpen] = useState(false);

	// EXPERIMENTAL light mode (invert hack). Not fleet standard - see index.css.
	// Toggling `.dark` off the root flips the invert filter; persisted so the
	// choice survives reloads. Delete this + the CSS block to revert.
	const [light, setLight] = useState(() => {
		try {
			return localStorage.getItem("butterchurn-light-mode") === "1";
		} catch {
			return false;
		}
	});

	useEffect(() => {
		document.documentElement.classList.toggle("dark", !light);
		try {
			localStorage.setItem("butterchurn-light-mode", light ? "1" : "0");
		} catch {
			// ignore storage errors
		}
	}, [light]);

	const refresh = useCallback(async () => {
		setBackendOk(await checkBackendHealth());
	}, []);

	useEffect(() => {
		refresh();
		const interval = setInterval(refresh, 10_000);
		return () => clearInterval(interval);
	}, [refresh]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.ctrlKey && e.key === "l") {
				e.preventDefault();
				setLoggerOpen(true);
			}
			if (e.ctrlKey && e.key === "h") {
				e.preventDefault();
				setHelpOpen(true);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	return (
		<BrowserRouter>
			<div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
				<motion.aside
					animate={{ width: collapsed ? 56 : 200 }}
					transition={{ duration: 0.2 }}
					className="flex flex-col bg-zinc-900 border-r border-zinc-800 shrink-0 overflow-hidden"
				>
					<div className="flex items-center justify-between px-2 py-2 border-b border-zinc-800">
						<div className="flex items-center gap-1 min-w-0">
							<span className="text-lg shrink-0">🌊</span>
							{!collapsed && (
								<motion.span
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									className="font-semibold text-amber-400 text-sm tracking-wide whitespace-nowrap truncate"
								>
									Butterchurn
								</motion.span>
							)}
						</div>
						<button
							type="button"
							onClick={() => setCollapsed((c) => !c)}
							aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
							title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
							className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors shrink-0"
							data-testid="sidebar-toggle"
						>
							{collapsed ? (
								<ChevronRight size={16} />
							) : (
								<ChevronLeft size={16} />
							)}
						</button>
					</div>

					<nav className="flex-1 py-3 space-y-0.5 px-1.5 overflow-y-auto">
						{NAV.map(({ to, label, icon: Icon }) => (
							<NavLink
								key={to}
								to={to}
								end={to === "/"}
								className={({ isActive }) =>
									clsx(
										"flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-colors",
										isActive
											? "bg-amber-500/20 text-amber-300"
											: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800",
									)
								}
							>
								<Icon size={16} className="shrink-0" />
								{!collapsed && (
									<motion.span
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										className="whitespace-nowrap"
									>
										{label}
									</motion.span>
								)}
							</NavLink>
						))}
					</nav>

					<div className="border-t border-zinc-800 px-3 py-2.5">
						<div className="flex items-center gap-2">
							<span
								className={clsx(
									"w-2 h-2 rounded-full shrink-0",
									backendOk === null
										? "bg-zinc-500 animate-pulse"
										: backendOk
											? "bg-green-500"
											: "bg-red-500",
								)}
							/>
							{!collapsed && (
								<span className="text-sm text-zinc-400">
									{backendOk === null
										? "Connecting…"
										: backendOk
											? "Backend online"
											: "Backend offline"}
								</span>
							)}
						</div>
						{!collapsed && (
							<p className="text-[10px] text-zinc-600 mt-1.5">
								MilkDrop · BPM sync · mixx-dj
							</p>
						)}
					</div>
				</motion.aside>

				<div className="flex-1 flex flex-col min-w-0 min-h-0">
					<header className="flex items-center justify-end gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
						<button
							type="button"
							onClick={() => setLight((v) => !v)}
							className="flex items-center gap-1.5 px-2.5 py-1 rounded text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
							title={
								light
									? "Switch to dark (experimental light mode)"
									: "Switch to light (experimental, ugly)"
							}
							aria-label="Toggle light mode (experimental)"
						>
							{light ? <Moon size={14} /> : <Sun size={14} />}
						</button>
						<button
							type="button"
							onClick={() => setLoggerOpen(true)}
							className="flex items-center gap-1.5 px-2.5 py-1 rounded text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
							title="Logger (Ctrl+L)"
						>
							<Terminal size={14} />
							<span className="hidden sm:inline">Logs</span>
						</button>
						<button
							type="button"
							onClick={() => setHelpOpen(true)}
							className="flex items-center gap-1.5 px-2.5 py-1 rounded text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
							title="Help (Ctrl+H)"
						>
							<HelpCircle size={14} />
							<span className="hidden sm:inline">Help</span>
						</button>
					</header>

					<main className="flex-1 overflow-hidden min-h-0">
						<AnimatePresence mode="wait">
							<Routes>
								<Route path="/" element={<Dashboard backendOk={backendOk} />} />
								<Route path="/toolbox" element={<ToolboxPage />} />
								<Route path="/presets" element={<PresetsPage />} />
								<Route
									path="/demo"
									element={<Navigate to="/presets" replace />}
								/>
								<Route path="/visualizer" element={<VisualizerPage />} />
								<Route path="/tools" element={<Tools />} />
								<Route path="/skills" element={<Skills />} />
								<Route path="/chat" element={<Chat />} />
								<Route path="/settings" element={<SettingsPage />} />
								<Route path="/logs" element={<LogsPage />} />
								<Route path="/help" element={<HelpPage />} />
							</Routes>
						</AnimatePresence>
					</main>
				</div>

				<LoggerModal open={loggerOpen} onClose={() => setLoggerOpen(false)} />
				<HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
			</div>
		</BrowserRouter>
	);
}
