import clsx from "clsx";
import { motion } from "framer-motion";
import {
	ExternalLink,
	Grid3X3,
	Heart,
	Pause,
	Play,
	Search,
	Shuffle,
	Star,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PresetPreview from "../components/PresetPreview";
import PresetThumb from "../components/PresetThumb";
import { usePresets } from "../lib/PresetsContext";
import {
	type PresetEntry,
	getAuthors,
	getCategories,
	loadFavorites,
	loadLastPresetIndex,
	saveFavorites,
	saveLastPresetIndex,
} from "../lib/presets";

const PAGE_SIZE = 48;

function PresetCard({
	entry,
	selected,
	favorite,
	onSelect,
	onToggleFavorite,
}: {
	entry: PresetEntry;
	selected: boolean;
	favorite: boolean;
	onSelect: () => void;
	onToggleFavorite: (e: React.MouseEvent) => void;
}) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={clsx(
				"group text-left rounded-xl border overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-amber-500/10",
				selected
					? "border-amber-400 ring-2 ring-amber-400/40"
					: "border-zinc-800 hover:border-zinc-600",
			)}
		>
			<div className="aspect-video relative">
				<PresetThumb entry={entry} className="w-full h-full" />
				<div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
				<button
					type="button"
					onClick={onToggleFavorite}
					className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-zinc-300 hover:text-amber-300 opacity-0 group-hover:opacity-100 transition-opacity"
					title={favorite ? "Remove favorite" : "Favorite"}
				>
					<Heart
						size={14}
						className={favorite ? "fill-amber-400 text-amber-400" : ""}
					/>
				</button>
				{selected && (
					<span className="absolute bottom-2 left-2 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-black px-2 py-0.5 rounded">
						Live
					</span>
				)}
			</div>
			<div className="p-2.5 bg-zinc-900">
				<p className="text-xs font-medium text-zinc-200 line-clamp-2 leading-snug">
					{entry.name}
				</p>
				<div className="flex items-center gap-1.5 mt-1">
					<p className="text-[10px] text-zinc-500 truncate">{entry.author}</p>
					<span className="text-[9px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase tracking-wider">
						{entry.category}
					</span>
				</div>
			</div>
		</button>
	);
}

export default function PresetsPage() {
	const { presets, loading, error, ensureCategory } = usePresets();
	const [query, setQuery] = useState("");
	const [category, setCategory] = useState("");
	const [author, setAuthor] = useState("");
	const [favoritesOnly, setFavoritesOnly] = useState(false);
	const [loadingLazy, setLoadingLazy] = useState(false);
	const [favorites, setFavorites] = useState<Set<number>>(() =>
		loadFavorites(),
	);
	const [selectedIndex, setSelectedIndex] = useState(() =>
		loadLastPresetIndex(),
	);
	const [page, setPage] = useState(0);
	const [slideshow, setSlideshow] = useState(false);

	const categories = useMemo(() => getCategories(), []);
	const authors = useMemo(() => getAuthors(presets), [presets]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return presets.filter((p) => {
			if (favoritesOnly && !favorites.has(p.index)) return false;
			if (category && p.category !== category) return false;
			if (author && p.author !== author) return false;
			if (!q) return true;
			return (
				p.name.toLowerCase().includes(q) || p.author.toLowerCase().includes(q)
			);
		});
	}, [presets, query, category, author, favoritesOnly, favorites]);

	const selected = useMemo(
		() => presets.find((p) => p.index === selectedIndex) ?? filtered[0] ?? null,
		[presets, selectedIndex, filtered],
	);

	useEffect(() => {
		if (selected) saveLastPresetIndex(selected.index);
	}, [selected]);

	const pageItems = useMemo(() => {
		const start = page * PAGE_SIZE;
		return filtered.slice(start, start + PAGE_SIZE);
	}, [filtered, page]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

	const selectPreset = useCallback((entry: PresetEntry) => {
		setSelectedIndex(entry.index);
	}, []);

	const toggleFavorite = useCallback((e: React.MouseEvent, index: number) => {
		e.stopPropagation();
		setFavorites((prev) => {
			const next = new Set(prev);
			if (next.has(index)) next.delete(index);
			else next.add(index);
			saveFavorites(next);
			return next;
		});
	}, []);

	const pickRandom = useCallback(() => {
		if (!filtered.length) return;
		const pick = filtered[Math.floor(Math.random() * filtered.length)];
		setSelectedIndex(pick.index);
	}, [filtered]);

	useEffect(() => {
		if (!slideshow || filtered.length < 2) return;
		const id = setInterval(() => {
			setSelectedIndex((cur) => {
				const pos = filtered.findIndex((p) => p.index === cur);
				const next = filtered[(pos + 1 + filtered.length) % filtered.length];
				return next?.index ?? cur;
			});
		}, 8000);
		return () => clearInterval(id);
	}, [slideshow, filtered]);

	useEffect(() => {
		setPage(0);
	}, [query, category, author, favoritesOnly]);

	useEffect(() => {
		if (!category || category.startsWith("ProjectM Cream") === false) return;
		let cancelled = false;
		setLoadingLazy(true);
		ensureCategory(category)
			.catch(() => {})
			.finally(() => {
				if (!cancelled) setLoadingLazy(false);
			});
		return () => {
			cancelled = true;
		};
	}, [category, ensureCategory]);

	return (
		<div className="h-full flex flex-col overflow-hidden">
			<div className="shrink-0 border-b border-zinc-800 bg-zinc-950">
				<div className="px-4 py-3 flex flex-wrap items-center gap-3">
					<div className="flex items-center gap-2">
						<Grid3X3 size={18} className="text-amber-400" />
						<h1 className="text-lg font-semibold text-zinc-100">
							Preset browser
						</h1>
						{!loading && (
							<span className="text-xs text-zinc-500 font-mono">
								{filtered.length} / {presets.length}
							</span>
						)}
					</div>
					<div className="flex-1 min-w-[200px] max-w-md relative">
						<Search
							size={14}
							className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
						/>
						<input
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search presets or authors…"
							className="w-full h-9 pl-9 pr-3 rounded-lg border border-zinc-700 bg-zinc-900 text-sm text-zinc-100 placeholder:text-zinc-500"
						/>
					</div>
					<select
						value={category}
						onChange={(e) => setCategory(e.target.value)}
						className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-300"
					>
						<option value="">All packs</option>
						{categories.map((c) => (
							<option key={c} value={c}>
								{c}
							</option>
						))}
					</select>
					<select
						value={author}
						onChange={(e) => setAuthor(e.target.value)}
						className="h-9 rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-300"
					>
						<option value="">All authors</option>
						{authors.slice(0, 40).map((a) => (
							<option key={a} value={a}>
								{a}
							</option>
						))}
					</select>
					<button
						type="button"
						onClick={() => setFavoritesOnly((v) => !v)}
						className={clsx(
							"h-9 px-3 rounded-lg text-sm flex items-center gap-1.5 border transition-colors",
							favoritesOnly
								? "border-amber-500/50 bg-amber-500/10 text-amber-300"
								: "border-zinc-700 text-zinc-400 hover:bg-zinc-800",
						)}
					>
						<Star size={14} />
						Favorites
					</button>
					<button
						type="button"
						onClick={pickRandom}
						className="h-9 px-3 rounded-lg text-sm flex items-center gap-1.5 border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
					>
						<Shuffle size={14} />
						Random
					</button>
					<button
						type="button"
						onClick={() => setSlideshow((s) => !s)}
						className={clsx(
							"h-9 px-3 rounded-lg text-sm flex items-center gap-1.5 border transition-colors",
							slideshow
								? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
								: "border-zinc-700 text-zinc-400 hover:bg-zinc-800",
						)}
					>
						{slideshow ? <Pause size={14} /> : <Play size={14} />}
						Demo
					</button>
					{selected && (
						<Link
							to={`/visualizer?i=${selected.index}`}
							className="h-9 px-3 rounded-lg text-sm flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-medium"
						>
							<ExternalLink size={14} />
							Fullscreen
						</Link>
					)}
				</div>

				<div className="h-52 sm:h-64 lg:h-72 border-t border-zinc-800">
					<PresetPreview
						preset={selected}
						className="h-full w-full"
						transitionSec={slideshow ? 2.5 : 1.5}
					/>
				</div>

				{selected && (
					<div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/80">
						<p className="text-sm text-zinc-200 truncate">{selected.name}</p>
						<p className="text-xs text-zinc-500">
							{selected.author}{" "}
							<span className="text-[10px] text-zinc-600 ml-1.5 uppercase tracking-wider">
								{selected.category}
							</span>
						</p>
					</div>
				)}
			</div>

			<div className="flex-1 overflow-y-auto p-4">
				{loading && (
					<p className="text-sm text-zinc-500">Loading preset library…</p>
				)}
				{loadingLazy && (
					<p className="text-sm text-amber-400">
						Loading ProjectM Cream presets… (large pack, one-time download)
					</p>
				)}
				{error && <p className="text-sm text-red-400">{error}</p>}

				{!loading && !loadingLazy && filtered.length === 0 && (
					<p className="text-sm text-zinc-500 text-center py-12">
						No presets match your filters
					</p>
				)}

				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3"
				>
					{pageItems.map((entry) => (
						<PresetCard
							key={entry.index}
							entry={entry}
							selected={selected?.index === entry.index}
							favorite={favorites.has(entry.index)}
							onSelect={() => selectPreset(entry)}
							onToggleFavorite={(e) => toggleFavorite(e, entry.index)}
						/>
					))}
				</motion.div>

				{totalPages > 1 && (
					<div className="flex items-center justify-center gap-2 mt-6 pb-4">
						<button
							type="button"
							disabled={page === 0}
							onClick={() => setPage((p) => p - 1)}
							className="px-3 py-1.5 rounded-lg text-sm border border-zinc-700 disabled:opacity-40 hover:bg-zinc-800"
						>
							Previous
						</button>
						<span className="text-sm text-zinc-500 font-mono">
							{page + 1} / {totalPages}
						</span>
						<button
							type="button"
							disabled={page >= totalPages - 1}
							onClick={() => setPage((p) => p + 1)}
							className="px-3 py-1.5 rounded-lg text-sm border border-zinc-700 disabled:opacity-40 hover:bg-zinc-800"
						>
							Next
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
