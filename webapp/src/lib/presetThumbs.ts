const DB_NAME = "butterchurn-thumbs";
const STORE = "thumbs";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
	if (dbPromise) return dbPromise;
	dbPromise = new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE)) {
				db.createObjectStore(STORE);
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
	return dbPromise;
}

async function withStore<T>(
	mode: IDBTransactionMode,
	fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
	const db = await openDb();
	return new Promise<T>((resolve, reject) => {
		const tx = db.transaction(STORE, mode);
		const store = tx.objectStore(STORE);
		const req = fn(store);
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

export async function getThumb(name: string): Promise<string | null> {
	try {
		return (await withStore("readonly", (s) => s.get(name))) as string | null;
	} catch {
		return null;
	}
}

export async function setThumb(name: string, dataUrl: string): Promise<void> {
	try {
		await withStore("readwrite", (s) => s.put(dataUrl, name));
	} catch {
		// cache is best-effort
	}
}

/** Capture a still from a live-rendered butterchurn canvas at a capped resolution. */
export function captureCanvas(
	canvas: HTMLCanvasElement,
	maxW = 320,
	maxH = 180,
	quality = 0.7,
): string {
	try {
		const ratio = Math.min(1, maxW / canvas.width, maxH / canvas.height);
		if (ratio >= 1) return canvas.toDataURL("image/jpeg", quality);
		const w = Math.max(1, Math.round(canvas.width * ratio));
		const h = Math.max(1, Math.round(canvas.height * ratio));
		const off = document.createElement("canvas");
		off.width = w;
		off.height = h;
		const ctx = off.getContext("2d");
		if (!ctx) return canvas.toDataURL("image/jpeg", quality);
		ctx.drawImage(canvas, 0, 0, w, h);
		return off.toDataURL("image/jpeg", quality);
	} catch {
		return "";
	}
}
