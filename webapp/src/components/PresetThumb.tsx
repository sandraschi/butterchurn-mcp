import { useEffect, useRef, useState } from "react";
import { usePresetCanvas } from "../hooks/usePresetCanvas";
import { usePresetSlot } from "../hooks/usePresetSlot";
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
	const slot = usePresetSlot(visible);
	const live = slot && size.width >= 16 && size.height >= 16;

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

	const canvasRef = usePresetCanvas({
		preset: live ? entry : null,
		width: size.width,
		height: size.height,
		transitionSec: 0,
		active: live,
	});

	return (
		<div
			ref={wrapRef}
			className={`relative aspect-video overflow-hidden ${className}`}
			style={{ background: presetGradient(entry.name) }}
		>
			{live && (
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
