import { useEffect, useRef, useState } from "react";

const MAX_ACTIVE = 16;
let activeCount = 0;
const queue: Array<() => void> = [];

function acquire(): Promise<() => void> {
	return new Promise((resolve) => {
		const grant = () => {
			activeCount++;
			resolve(() => {
				activeCount--;
				const next = queue.shift();
				if (next) next();
			});
		};
		if (activeCount < MAX_ACTIVE) grant();
		else queue.push(grant);
	});
}

export function usePresetSlot(visible: boolean): boolean {
	const [slot, setSlot] = useState(false);
	const visibleRef = useRef(visible);
	visibleRef.current = visible;

	useEffect(() => {
		if (!visible) return;
		let cancelled = false;
		let release: (() => void) | null = null;
		(async () => {
			release = await acquire();
			if (cancelled || !visibleRef.current) {
				release();
				return;
			}
			setSlot(true);
		})();
		return () => {
			cancelled = true;
			if (release) release();
			setSlot(false);
		};
	}, [visible]);

	return slot;
}
