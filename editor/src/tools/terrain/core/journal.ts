import { clampTerrainRect, isTerrainRectEmpty, unionTerrainRect } from "./rect";
import type { ITerrainRect, ITerrainTileResource, ITerrainUndoPayload, TerrainRectsByKind, TerrainResourceKind, TerrainTileResourceProvider } from "./types";

/** Tile sizes of the undo journal per resource (§7.1). */
export const TERRAIN_TILE_SIZES: Readonly<Record<TerrainResourceKind, number>> = {
	heights: 32,
	holes: 32,
	weights0: 64,
	weights1: 64,
};

type TerrainTileData = Float32Array | Uint8Array;

/**
 * Stored tiles of one resource.
 *
 * Tile (tx, ty) covers the elements [tx T, min((tx + 1) T, width) - 1] x [ty T, min((ty + 1) T, height) - 1]. It is stored row-major with
 * the row stride `stride` (in elements) and the resource's channel count: element (x, y) is at ((y - ty T) stride + (x - tx T)) channels.
 * Journal tiles are full T x T blocks (stride T, T a power of two, so reads use shifts and masks; border tiles leave their outer part
 * unused); the single tile of a full payload is the whole resource (stride = width).
 */
interface ITerrainTileSet {
	readonly kind: TerrainResourceKind;
	readonly width: number;
	readonly height: number;
	readonly channels: number;
	readonly float: boolean;
	readonly tileSize: number;
	/** log2(tileSize) for journal sets (tileSize is a power of two), unused by full payloads. */
	readonly shift: number;
	/** tileSize - 1 for journal sets. */
	readonly mask: number;
	readonly stride: number;
	readonly tilesX: number;
	/** Stored tile per tile index (ty tilesX + tx), null when not captured. */
	readonly tiles: (TerrainTileData | null)[];
	/** Captured tile indices, in capture order. */
	readonly captured: number[];
	/** Live data of the resource (journal sets: refreshed at every touch, used by readBefore for tiles never touched). */
	live: TerrainTileData;
}

/**
 * Stroke undo journal (§7.1): the stroke engine calls `touch(kind, writeRect)` before every write; each tile overlapping the rect is
 * copied once (stroke-start content). `readBefore` serves stroke-start values to the paint model (§4.10.2). `commit()` hands the tiles
 * that changed to a swap payload; `revert()` (Escape) writes the captured tiles back.
 */
export class TerrainTileJournal {
	private readonly _provider: TerrainTileResourceProvider;
	private readonly _signature: string;

	// One field per kind (not a keyed record): readBefore runs for every texel and layer of a paint dab.
	private _heights: ITerrainTileSet | null = null;
	private _holes: ITerrainTileSet | null = null;
	private _weights0: ITerrainTileSet | null = null;
	private _weights1: ITerrainTileSet | null = null;

	/** Live resources of the kinds read before being touched (undefined = not queried yet). */
	private readonly _untouched: Record<TerrainResourceKind, ITerrainTileResource | null | undefined> = {
		heights: undefined,
		holes: undefined,
		weights0: undefined,
		weights1: undefined,
	};

	private _byteLength: number = 0;
	private _tileCount: number = 0;
	private _committed: boolean = false;

	/**
	 * @param provider gives the live resources; queried at every `touch`, at the first `readBefore` of a kind never touched, and by
	 * `commit`/`revert`.
	 * @param signature `${grid.signature}|${weightMapSize ?? 0}` at stroke start, stored in the committed payload.
	 */
	public constructor(provider: TerrainTileResourceProvider, signature: string) {
		this._provider = provider;
		this._signature = signature;
	}

	/** Captures, before any write, every tile overlapping rect not captured yet by this journal. Kinds without a live resource are ignored. */
	public touch(kind: TerrainResourceKind, rect: ITerrainRect): void {
		this._assertNotCommitted();

		const resource = this._provider(kind);
		if (!resource) {
			return;
		}

		let set = this._getSet(kind);
		if (!set) {
			set = createJournalTileSet(kind, resource, TERRAIN_TILE_SIZES[kind]);
			this._setSet(kind, set);
		} else if (!isSameLayout(set, resource)) {
			throw new Error(`terrain: the ${kind} resource changed size during a stroke`);
		}

		set.live = resource.data;

		const clamped = clampTerrainRect(rect, resource.width, resource.height);
		if (isTerrainRectEmpty(clamped)) {
			return;
		}

		const shift = set.shift;
		for (let ty = clamped.y0 >> shift, ty1 = clamped.y1 >> shift; ty <= ty1; ++ty) {
			for (let tx = clamped.x0 >> shift, tx1 = clamped.x1 >> shift; tx <= tx1; ++tx) {
				const index = ty * set.tilesX + tx;
				if (set.tiles[index]) {
					continue;
				}

				const tile = allocateTile(set, set.tileSize * set.tileSize);
				copyTile(resource.data, set, index, tile);

				set.tiles[index] = tile;
				set.captured.push(index);

				this._byteLength += tile.byteLength;
				++this._tileCount;
			}
		}
	}

	/**
	 * Stroke-start value of element (x, y), channel `channel`: captured tile data, or live data when the tile was never touched (so it was
	 * never written). 0 when the resource doesn't exist. (x, y) must lie inside the resource.
	 */
	public readBefore(kind: TerrainResourceKind, x: number, y: number, channel: number): number {
		const set = kind === "weights0" ? this._weights0 : kind === "weights1" ? this._weights1 : kind === "heights" ? this._heights : this._holes;

		if (set !== null) {
			const shift = set.shift;
			const tile = set.tiles[(y >> shift) * set.tilesX + (x >> shift)];
			if (tile !== null) {
				return tile[(((y & set.mask) << shift) + (x & set.mask)) * set.channels + channel];
			}

			return set.live[(y * set.width + x) * set.channels + channel];
		}

		let resource = this._untouched[kind];
		if (resource === undefined) {
			resource = this._provider(kind);
			this._untouched[kind] = resource;
		}

		return resource ? resource.data[(y * resource.width + x) * resource.channels + channel] : 0;
	}

	/** Bytes of the captured tiles. */
	public get byteLength(): number {
		return this._byteLength;
	}

	/** True while no tile is captured. */
	public get isEmpty(): boolean {
		return this._tileCount === 0;
	}

	/**
	 * Swap payload holding the captured tiles whose content changed since they were captured; null when nothing was touched or nothing
	 * changed (a stroke that changed nothing registers no undo entry, §7.2). The journal can't be used afterwards.
	 */
	public commit(): ITerrainUndoPayload | null {
		this._assertNotCommitted();
		this._committed = true;

		const sets: ITerrainTileSet[] = [];
		for (const set of this._takeCapturedSets()) {
			const resource = this._provider(set.kind);
			if (resource && isSameLayout(set, resource)) {
				dropUnchangedTiles(set, resource.data);
			}

			if (set.captured.length) {
				sets.push(set);
			}
		}

		return sets.length ? new TerrainTilePayload(sets, this._signature) : null;
	}

	/** Restores the captured tiles (cancel); returns the restored rects. The journal is empty afterwards and can capture again. */
	public revert(): TerrainRectsByKind {
		this._assertNotCommitted();

		const restored: TerrainRectsByKind = {};

		for (const set of this._takeCapturedSets()) {
			const resource = this._provider(set.kind);
			if (!resource || !isSameLayout(set, resource)) {
				continue;
			}

			let rect: ITerrainRect | null = null;
			for (const index of set.captured) {
				const tile = set.tiles[index];
				if (tile) {
					rect = unionTerrainRect(rect, writeTile(resource.data, set, index, tile, false));
				}
			}

			if (rect) {
				restored[set.kind] = rect;
			}
		}

		return restored;
	}

	private _getSet(kind: TerrainResourceKind): ITerrainTileSet | null {
		switch (kind) {
			case "heights":
				return this._heights;
			case "holes":
				return this._holes;
			case "weights0":
				return this._weights0;
			case "weights1":
				return this._weights1;
		}
	}

	private _setSet(kind: TerrainResourceKind, set: ITerrainTileSet | null): void {
		switch (kind) {
			case "heights":
				this._heights = set;
				break;
			case "holes":
				this._holes = set;
				break;
			case "weights0":
				this._weights0 = set;
				break;
			case "weights1":
				this._weights1 = set;
				break;
		}
	}

	/** Detaches the tile sets that captured something and resets the capture state. */
	private _takeCapturedSets(): ITerrainTileSet[] {
		const sets: ITerrainTileSet[] = [];

		for (const kind of ["heights", "holes", "weights0", "weights1"] as const) {
			const set = this._getSet(kind);
			if (set && set.captured.length) {
				sets.push(set);
			}

			this._setSet(kind, null);
		}

		this._byteLength = 0;
		this._tileCount = 0;

		return sets;
	}

	private _assertNotCommitted(): void {
		if (this._committed) {
			throw new Error("terrain: the tile journal was committed and can't be used anymore");
		}
	}
}

/**
 * Swap payload (§7.1): holds tiles; `swap` exchanges each stored tile with the live data, so undo and redo are the same call and a single
 * copy is stored. Full payloads are the same class with one tile covering each resource.
 */
class TerrainTilePayload implements ITerrainUndoPayload {
	/** Size of the stored data when the payload was created (unchanged by `release`, so an undo store can subtract it at any time). */
	public readonly byteLength: number;
	public readonly signature: string;

	private _sets: ITerrainTileSet[] | null;

	public constructor(sets: ITerrainTileSet[], signature: string) {
		this._sets = sets;
		this.signature = signature;

		let byteLength = 0;
		for (const set of sets) {
			for (const index of set.captured) {
				byteLength += set.tiles[index]?.byteLength ?? 0;
			}
		}

		this.byteLength = byteLength;
	}

	public get released(): boolean {
		return this._sets === null;
	}

	/**
	 * Exchanges stored and live data (undo === redo). No-op returning {} when released, when `signature` differs, or when a live resource
	 * is missing or has another layout (nothing is applied partially).
	 */
	public swap(provider: TerrainTileResourceProvider, signature: string): TerrainRectsByKind {
		const sets = this._sets;
		if (!sets || signature !== this.signature) {
			return {};
		}

		const resources: ITerrainTileResource[] = [];
		for (const set of sets) {
			const resource = provider(set.kind);
			if (!resource || !isSameLayout(set, resource)) {
				return {};
			}

			resources.push(resource);
		}

		const changed: TerrainRectsByKind = {};

		sets.forEach((set, setIndex) => {
			const data = resources[setIndex].data;

			let rect: ITerrainRect | null = null;
			for (const index of set.captured) {
				const tile = set.tiles[index];
				if (tile) {
					rect = unionTerrainRect(rect, writeTile(data, set, index, tile, true));
				}
			}

			if (rect) {
				changed[set.kind] = rect;
			}
		});

		return changed;
	}

	public release(): void {
		this._sets = null;
	}
}

/** Whole-state payload (`createTerrainSnapshotPayload`). */
class TerrainSnapshotPayload<T> implements ITerrainUndoPayload {
	/** Declared size of the state (unchanged by `release`). */
	public readonly byteLength: number;
	public readonly signature: string;

	private _released: boolean = false;
	private _state: T | null;
	private _exchange: ((state: T) => { previous: T; changed: TerrainRectsByKind }) | null;

	public constructor(options: { state: T; byteLength: number; signature: string; exchange: (state: T) => { previous: T; changed: TerrainRectsByKind } }) {
		this._state = options.state;
		this._exchange = options.exchange;
		this.byteLength = options.byteLength;
		this.signature = options.signature;
	}

	public get released(): boolean {
		return this._released;
	}

	/** Installs the stored state through `exchange` and keeps the state it replaced. Ignores signatures; {} once released. */
	public swap(_provider: TerrainTileResourceProvider, _signature: string): TerrainRectsByKind {
		if (this._released || !this._exchange) {
			return {};
		}

		const { previous, changed } = this._exchange(this._state as T);
		this._state = previous;

		return changed;
	}

	public release(): void {
		this._released = true;
		this._state = null;
		this._exchange = null;
	}
}

/** Captures EVERY tile of `kinds` now (call before a global operation). Kinds without a live resource are skipped. */
export function createTerrainFullPayload(provider: TerrainTileResourceProvider, kinds: TerrainResourceKind[], signature: string): ITerrainUndoPayload {
	const sets: ITerrainTileSet[] = [];

	for (const kind of new Set(kinds)) {
		const resource = provider(kind);
		if (!resource || resource.width < 1 || resource.height < 1) {
			continue;
		}

		// One tile covering the whole resource (stride = width): the stored copy is contiguous.
		const set: ITerrainTileSet = {
			kind,
			width: resource.width,
			height: resource.height,
			channels: resource.channels,
			float: resource.data instanceof Float32Array,
			tileSize: Math.max(resource.width, resource.height),
			shift: 0,
			mask: 0,
			stride: resource.width,
			tilesX: 1,
			tiles: [null],
			captured: [0],
			live: resource.data,
		};

		const tile = allocateTile(set, resource.width * resource.height);
		copyTile(resource.data, set, 0, tile);
		set.tiles[0] = tile;

		sets.push(set);
	}

	return new TerrainTilePayload(sets, signature);
}

/** Whole-state payload (resize, material swap...): exchange() installs `state` and returns the state it replaced. Ignores signatures. */
export function createTerrainSnapshotPayload<T>(options: {
	state: T;
	byteLength: number;
	signature: string;
	exchange: (state: T) => { previous: T; changed: TerrainRectsByKind };
}): ITerrainUndoPayload {
	return new TerrainSnapshotPayload<T>(options);
}

function createJournalTileSet(kind: TerrainResourceKind, resource: ITerrainTileResource, tileSize: number): ITerrainTileSet {
	const shift = Math.round(Math.log2(tileSize));
	if (!(tileSize >= 1) || 1 << shift !== tileSize) {
		throw new Error(`terrain: the ${kind} tile size must be a power of two (${tileSize})`);
	}

	const tilesX = Math.ceil(resource.width / tileSize);
	const tilesY = Math.ceil(resource.height / tileSize);

	return {
		kind,
		width: resource.width,
		height: resource.height,
		channels: resource.channels,
		float: resource.data instanceof Float32Array,
		tileSize,
		shift,
		mask: tileSize - 1,
		stride: tileSize,
		tilesX,
		tiles: new Array<TerrainTileData | null>(Math.max(0, tilesX * tilesY)).fill(null),
		captured: [],
		live: resource.data,
	};
}

function isSameLayout(set: ITerrainTileSet, resource: ITerrainTileResource): boolean {
	return set.width === resource.width && set.height === resource.height && set.channels === resource.channels && set.float === resource.data instanceof Float32Array;
}

function allocateTile(set: ITerrainTileSet, elements: number): TerrainTileData {
	const length = elements * set.channels;
	return set.float ? new Float32Array(length) : new Uint8Array(length);
}

/** Element rect covered by tile `index` (clamped to the resource). */
function getTileRect(set: ITerrainTileSet, index: number): ITerrainRect {
	const tx = index % set.tilesX;
	const ty = (index - tx) / set.tilesX;

	const x0 = tx * set.tileSize;
	const y0 = ty * set.tileSize;

	return {
		x0,
		y0,
		x1: Math.min(x0 + set.tileSize, set.width) - 1,
		y1: Math.min(y0 + set.tileSize, set.height) - 1,
	};
}

/** Copies the live elements of tile `index` into `tile`. */
function copyTile(data: TerrainTileData, set: ITerrainTileSet, index: number, tile: TerrainTileData): void {
	const rect = getTileRect(set, index);
	const channels = set.channels;
	const rowLength = (rect.x1 - rect.x0 + 1) * channels;

	for (let y = rect.y0; y <= rect.y1; ++y) {
		const start = (y * set.width + rect.x0) * channels;
		const target = (y - rect.y0) * set.stride * channels;

		if (set.float) {
			(tile as Float32Array).set((data as Float32Array).subarray(start, start + rowLength), target);
		} else {
			(tile as Uint8Array).set((data as Uint8Array).subarray(start, start + rowLength), target);
		}
	}
}

/**
 * Writes a stored tile into the live data: an exchange (the tile then holds the previous live content) when `exchange` is true, a plain
 * copy otherwise. Returns the element rect of the tile.
 */
function writeTile(data: TerrainTileData, set: ITerrainTileSet, index: number, tile: TerrainTileData, exchange: boolean): ITerrainRect {
	const rect = getTileRect(set, index);
	const channels = set.channels;
	const rowLength = (rect.x1 - rect.x0 + 1) * channels;

	for (let y = rect.y0; y <= rect.y1; ++y) {
		const liveStart = (y * set.width + rect.x0) * channels;
		const tileStart = (y - rect.y0) * set.stride * channels;

		if (exchange) {
			for (let i = 0; i < rowLength; ++i) {
				const value = data[liveStart + i];
				data[liveStart + i] = tile[tileStart + i];
				tile[tileStart + i] = value;
			}
		} else {
			for (let i = 0; i < rowLength; ++i) {
				data[liveStart + i] = tile[tileStart + i];
			}
		}
	}

	return rect;
}

/** Removes (and frees) the tiles whose stored content equals the live content: undoing them would change nothing. */
function dropUnchangedTiles(set: ITerrainTileSet, data: TerrainTileData): void {
	const kept: number[] = [];

	for (const index of set.captured) {
		const tile = set.tiles[index];
		if (tile && !isTileUnchanged(data, set, index, tile)) {
			kept.push(index);
		} else {
			set.tiles[index] = null;
		}
	}

	set.captured.length = 0;
	set.captured.push(...kept);
}

function isTileUnchanged(data: TerrainTileData, set: ITerrainTileSet, index: number, tile: TerrainTileData): boolean {
	const rect = getTileRect(set, index);
	const channels = set.channels;
	const rowLength = (rect.x1 - rect.x0 + 1) * channels;

	for (let y = rect.y0; y <= rect.y1; ++y) {
		const liveStart = (y * set.width + rect.x0) * channels;
		const tileStart = (y - rect.y0) * set.stride * channels;

		for (let i = 0; i < rowLength; ++i) {
			// NaN never equals itself: a NaN element counts as changed (conservative).
			if (data[liveStart + i] !== tile[tileStart + i]) {
				return false;
			}
		}
	}

	return true;
}
