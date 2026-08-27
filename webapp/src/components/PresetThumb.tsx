import { useEffect, useRef, useState } from "react";
import { usePresetCanvas } from "../hooks/usePresetCanvas";
import { usePresetSlot } from "../hooks/usePresetSlot";
import { captureCanvas, getThumb, setThumb } from "../lib/presetThumbs";
import { type PresetEntry, presetGradient } from "../lib/presets";

export default function PresetThumb({
	entry,
	className = "",
}: {
	entry: PresetEntry;
	className?: string;
}) {
	const wrapRef = useRef<HTMLDivElement>(null);
	const [visible, setVisible] = useState(false);
	const [size, setSize] = useState({ width: 0, height: 0 });
	const [still, setStill] = useState<string | null>(null);
	const slot = usePresetSlot(visible && !still);
	const live = slot && size.width >= 16 && size.height >= 16;

	const canvasRef = usePresetCanvas({
		preset: live ? entry : null,
		width: size.width,
		height: size.height,
		transitionSec: 0,
		active: live,
	});

	useEffect(() => {
		let cancelled = false;
		getThumb(entry.name).then((t) => {
			if (!cancelled && t) setStill(t);
		});
		return () => {
			cancelled = true;
		};
	}, [entry.name]);

	useEffect(() => {
		const el = wrapRef.current;
		if (!el) return;
		const io = new IntersectionObserver(
			(entries) => setVisible(entries[0]?.isIntersecting ?? false),
			{ rootMargin: "200px" },
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);

	useEffect(() => {
		const el = wrapRef.current;
		if (!el) return;
		const ro = new ResizeObserver((entries) => {
			const { width, height } = entries[0].contentRect;
			setSize({
				width: Math.max(0, Math.floor(width)),
				height: Math.max(0, Math.floor(height)),
			});
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		if (!live || still) return;
		// Give the preset a moment to settle, then capture a still.
		const timer = setTimeout(() => {
			const canvas = canvasRef.current;
			if (!canvas) return;
			const dataUrl = captureCanvas(canvas);
			if (dataUrl) {
				setStill(dataUrl);
				void setThumb(entry.name, dataUrl);
			}
		}, 1200);
		return () => clearTimeout(timer);
	}, [live, still, entry.name, canvasRef]);

	return (
		<div
			ref={wrapRef}
			className={`relative aspect-video overflow-hidden ${className}`}
			style={{ background: presetGradient(entry.name) }}
		>
			{still && (
				<img
					src={still}
					alt={entry.name}
					className="w-full h-full block object-cover"
					loading="lazy"
					decoding="async"
				/>
			)}
			{live && !still && (
				<canvas
					ref={canvasRef}
					className="w-full h-full block"
					width={size.width}
					height={size.height}
				/>
			)}
		</div>
	);
}
