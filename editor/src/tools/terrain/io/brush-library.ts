import { Observable } from "babylonjs";

import { toast } from "sonner";
import { watch } from "fs";
import { ipcRenderer } from "electron";
import { basename, dirname, extname, join, normalize } from "path/posix";
import { copyFile, ensureDir, existsSync, readFile, remove, rename, stat, statSync, writeFile } from "fs-extra";

import { findAvailableFilename } from "../../fs";
import { executeSimpleWorker, type WorkerMessageData } from "../../worker";

import { createTerrainFalloffLut } from "../core/falloff";
import { evaluateTerrainBrushShape } from "../core/footprint";
import { TERRAIN_BUILTIN_BRUSHES, createTerrainBuiltinBrushShape } from "../core/builtin-brushes";
import type { ITerrainBrushMask, ITerrainBrushShape, ITerrainImage, TerrainFalloff } from "../core/types";

import { TERRAIN_BRUSH_IMAGE_EXTENSIONS } from "./sources";
import { getProjectDirectory, resolveRenamedAssetPath } from "./paths";
import { TERRAIN_BRUSH_EXR_MESSAGE, decodeTerrainBrushMask, detectTerrainBrushChannel, encodeTerrainBrushMaskPng, encodeTerrainBrushPng16 } from "./brush-decode";

export interface ITerrainLibraryBrush {
	/** "builtin:<name>" or "b-" + 8 hex characters. */
	id: string;
	name: string;
	builtin: boolean;
	/** Project-relative path of the image (after rename resolution); null for built-ins. */
	path: string | null;
	channel: "luminance" | "alpha" | "red";
	invert: boolean;
	defaults: Partial<{ radius: number; strength: number; hardness: number; rotation: number; spacing: number; stampHeight: number }> | null;
	favorite: boolean;
	missing: boolean;
}

/** Folder of the brush library, relative to the project directory (next to assets/; never exported or packed, §6.9). */
export const TERRAIN_BRUSHES_FOLDER = "terrain-brushes";
/** File of the brush library inside TERRAIN_BRUSHES_FOLDER (§6.9). */
export const TERRAIN_BRUSH_LIBRARY_FILE = "library.json";
export const TERRAIN_BRUSH_LIBRARY_VERSION = 1;
/** library.json is written this long after the last change (§1.9). */
export const TERRAIN_BRUSH_LIBRARY_WRITE_DELAY_MS = 300;
/** Changes of library.json made by another editor window are reloaded this long after the last file event (§1.9). */
export const TERRAIN_BRUSH_LIBRARY_WATCH_DELAY_MS = 500;
/** LRU size of the decoded masks (§2.3). */
export const TERRAIN_BRUSH_MASK_CACHE_SIZE = 64;
/** Size of the brush thumbnails (§6.9). */
export const TERRAIN_BRUSH_THUMBNAIL_SIZE = 64;

export type TerrainLibraryBrushChannel = ITerrainLibraryBrush["channel"];
export type TerrainLibraryBrushDefaults = NonNullable<ITerrainLibraryBrush["defaults"]>;

/** Image brush entry of library.json (§6.9). */
export interface ITerrainBrushLibraryEntry {
	id: string;
	name: string;
	/** As stored: project-relative ("/" separators), before rename resolution. */
	path: string;
	channel: TerrainLibraryBrushChannel;
	invert: boolean;
	defaults: TerrainLibraryBrushDefaults | null;
	favorite: boolean;
}

/** Parsed content of library.json. */
export interface ITerrainBrushLibraryContent {
	brushes: ITerrainBrushLibraryEntry[];
	/** Display order of every brush, built-ins and images interleaved (favourites are displayed first, in this sequence). */
	order: string[];
	/** Per-project defaults of the built-in brushes. */
	builtinDefaults: Record<string, TerrainLibraryBrushDefaults>;
}

export type TerrainBrushLibraryPatch = Partial<Pick<ITerrainBrushLibraryEntry, "name" | "path" | "channel" | "invert" | "defaults" | "favorite">>;

/** Local change kept until the next write, then re-applied onto the content read from disk (merge on write, §6.9). */
export type TerrainBrushLibraryMutation =
	| { type: "add"; entry: ITerrainBrushLibraryEntry }
	| { type: "update"; id: string; patch: TerrainBrushLibraryPatch }
	| { type: "remove"; id: string }
	| { type: "reorder"; order: string[] };

export interface ITerrainBrushLibraryAddResult {
	added: ITerrainLibraryBrush[];
	duplicates: ITerrainLibraryBrush[];
	rejected: { path: string; reason: string }[];
}

type TerrainBrushLibraryReadMode = "load" | "write" | "watch";

interface ITerrainBrushThumbnailResult {
	url: string | null;
	/** true when the image itself can't be decoded (the brush is then missing); false for other failures. */
	decodeFailed: boolean;
}

interface ITerrainBrushLibraryFile {
	content: ITerrainBrushLibraryContent;
	/** Text read from disk; null when the file doesn't exist (or was reset because it was corrupt). */
	text: string | null;
	/** true when the file exists but can't be parsed (write and watch modes only). */
	corrupt: boolean;
}

const TERRAIN_ROUND_BRUSH_ID = "builtin:round";
const TERRAIN_BRUSH_ID_PATTERN = /^b-[A-Za-z0-9_-]+$/;
const TERRAIN_BRUSH_CHANNELS: readonly TerrainLibraryBrushChannel[] = ["luminance", "alpha", "red"];
const TERRAIN_BRUSH_DEFAULT_KEYS: readonly (keyof TerrainLibraryBrushDefaults)[] = ["radius", "strength", "hardness", "rotation", "spacing", "stampHeight"];
const TERRAIN_BRUSH_MISSING_CHECK_INTERVAL_MS = 1000;
const TERRAIN_BRUSH_MD5_TIMEOUT_MS = 30000;
const TERRAIN_BRUSH_THUMBNAIL_FALLOFF: TerrainFalloff = "smooth";
const TERRAIN_BRUSH_THUMBNAIL_HARDNESS = 0.3;
const TERRAIN_LIBRARY_RESET_MESSAGE = "The brush library was corrupt and has been reset (backup kept).";

/**
 * Returns why a file can't be added as a brush (§1.9: EXR, unsupported extension), or null when its extension is accepted.
 * @param absolutePath defines the path of the file.
 */
export function getTerrainBrushFileError(absolutePath: string): string | null {
	const path = absolutePath.replace(/\\/g, "/");
	const extension = extname(path).toLowerCase();

	if (extension === ".exr") {
		return TERRAIN_BRUSH_EXR_MESSAGE;
	}

	if (!TERRAIN_BRUSH_IMAGE_EXTENSIONS.includes(extension)) {
		return `Unsupported brush file: ${basename(path)}`;
	}

	return null;
}

/**
 * Returns true for the ids of the built-in brushes ("builtin:round", ...).
 * @param id defines the id to test.
 */
export function isTerrainBuiltinBrushId(id: string): boolean {
	return TERRAIN_BUILTIN_BRUSHES.some((brush) => brush.id === id);
}

/**
 * Returns whether "Remove from library…" may offer to move the image of a brush to the OS trash (§1.9): a brush image file (accepted
 * extension, so never library.json or its backups) inside terrain-brushes/, given by a project-relative path that stays in that folder once
 * normalized ("terrain-brushes/../x.png" is refused). The library checks the resolved file again before trashing it.
 * @param relativePath defines the project-relative path of the brush image (ITerrainLibraryBrush.path).
 */
export function isTerrainBrushTrashablePath(relativePath: string | null | undefined): boolean {
	if (typeof relativePath !== "string" || !relativePath) {
		return false;
	}

	const path = relativePath.replace(/\\/g, "/");
	if (isTerrainAbsolutePath(path) || /^[A-Za-z]:/.test(path)) {
		return false;
	}

	const normalized = normalize(path);
	return isTerrainBrushesFolderPath(normalized) && getTerrainBrushFileError(normalized) === null;
}

/**
 * Returns an empty library: no image brush, the built-ins in their default order, no built-in defaults.
 */
export function createEmptyTerrainBrushLibraryContent(): ITerrainBrushLibraryContent {
	return {
		brushes: [],
		order: TERRAIN_BUILTIN_BRUSHES.map((brush) => brush.id),
		builtinDefaults: {},
	};
}

/**
 * Tolerant parse of library.json (§6.9): unknown fields dropped, invalid brush entries (no valid id or path, duplicated id) skipped and
 * counted, unknown ids of "order" ignored, ids missing from "order" appended (built-ins after the existing built-ins, images at the end),
 * built-in defaults of unknown ids dropped. Returns null when the root is not an object (corrupt file).
 * @param source defines the value parsed from the JSON text.
 */
export function parseTerrainBrushLibraryContent(source: unknown): { content: ITerrainBrushLibraryContent; invalidEntries: number } | null {
	if (!isTerrainRecord(source)) {
		return null;
	}

	const brushes: ITerrainBrushLibraryEntry[] = [];
	const ids = new Set<string>();
	let invalidEntries = 0;

	if (Array.isArray(source.brushes)) {
		for (const item of source.brushes) {
			const entry = parseTerrainBrushLibraryEntry(item);
			if (!entry || ids.has(entry.id)) {
				++invalidEntries;
				continue;
			}

			ids.add(entry.id);
			brushes.push(entry);
		}
	} else if (source.brushes !== undefined) {
		++invalidEntries;
	}

	const builtinDefaults: Record<string, TerrainLibraryBrushDefaults> = {};
	if (isTerrainRecord(source.builtinDefaults)) {
		for (const builtin of TERRAIN_BUILTIN_BRUSHES) {
			const defaults = sanitizeTerrainBrushDefaults(source.builtinDefaults[builtin.id]);
			if (defaults) {
				builtinDefaults[builtin.id] = defaults;
			}
		}
	}

	const order = Array.isArray(source.order) ? source.order.filter((id): id is string => typeof id === "string") : [];

	return {
		content: {
			brushes,
			order: normalizeTerrainBrushLibraryOrder(order, brushes),
			builtinDefaults,
		},
		invalidEntries,
	};
}

/**
 * Returns the complete order: known ids of `order` (first occurrence), then the missing built-ins inserted after the last built-in of the
 * order (at the start when there is none), then the missing images appended in the sequence of `brushes`.
 * @param order defines the order to normalize.
 * @param brushes defines the image brushes of the library.
 */
export function normalizeTerrainBrushLibraryOrder(order: readonly string[], brushes: readonly ITerrainBrushLibraryEntry[]): string[] {
	const known = new Set<string>([...TERRAIN_BUILTIN_BRUSHES.map((brush) => brush.id), ...brushes.map((brush) => brush.id)]);

	const result: string[] = [];
	const seen = new Set<string>();
	for (const id of order) {
		if (known.has(id) && !seen.has(id)) {
			seen.add(id);
			result.push(id);
		}
	}

	const missingBuiltins = TERRAIN_BUILTIN_BRUSHES.map((brush) => brush.id).filter((id) => !seen.has(id));
	if (missingBuiltins.length) {
		let lastBuiltinIndex = -1;
		result.forEach((id, index) => {
			if (isTerrainBuiltinBrushId(id)) {
				lastBuiltinIndex = index;
			}
		});

		result.splice(lastBuiltinIndex + 1, 0, ...missingBuiltins);
		missingBuiltins.forEach((id) => seen.add(id));
	}

	for (const brush of brushes) {
		if (!seen.has(brush.id)) {
			seen.add(brush.id);
			result.push(brush.id);
		}
	}

	return result;
}

/**
 * Display order (§6.9): favourites first in `order` sequence, then every other brush (built-ins and images interleaved) in `order` sequence.
 * @param content defines the library content.
 */
export function getTerrainBrushLibraryDisplayOrder(content: ITerrainBrushLibraryContent): string[] {
	const favorites = new Set(content.brushes.filter((brush) => brush.favorite).map((brush) => brush.id));
	const order = normalizeTerrainBrushLibraryOrder(content.order, content.brushes);

	return [...order.filter((id) => favorites.has(id)), ...order.filter((id) => !favorites.has(id))];
}

/**
 * Applies local mutations onto a library content (in place) and returns it (merge on write, §6.9): an add replaces an entry of the same id;
 * an update of an entry that doesn't exist any more (removed elsewhere) is dropped; a reorder re-sequences the ids it knows inside the slots
 * they occupy, so unknown ids (added elsewhere) keep their place.
 * @param content defines the content to modify.
 * @param mutations defines the mutations to apply, in order.
 */
export function applyTerrainBrushLibraryMutations(content: ITerrainBrushLibraryContent, mutations: readonly TerrainBrushLibraryMutation[]): ITerrainBrushLibraryContent {
	for (const mutation of mutations) {
		switch (mutation.type) {
			case "add": {
				const entry = cloneTerrainBrushLibraryEntry(mutation.entry);
				const index = content.brushes.findIndex((brush) => brush.id === entry.id);
				if (index >= 0) {
					content.brushes[index] = entry;
				} else {
					content.brushes.push(entry);
				}

				if (!content.order.includes(entry.id)) {
					content.order.push(entry.id);
				}
				break;
			}

			case "update": {
				if (isTerrainBuiltinBrushId(mutation.id)) {
					const defaults = mutation.patch.defaults;
					if (defaults) {
						content.builtinDefaults[mutation.id] = { ...defaults };
					} else if (defaults === null) {
						delete content.builtinDefaults[mutation.id];
					}
					break;
				}

				const entry = content.brushes.find((brush) => brush.id === mutation.id);
				if (entry) {
					applyTerrainBrushLibraryPatch(entry, mutation.patch);
				}
				break;
			}

			case "remove":
				// Built-ins can't be removed.
				if (!isTerrainBuiltinBrushId(mutation.id)) {
					content.brushes = content.brushes.filter((brush) => brush.id !== mutation.id);
					content.order = content.order.filter((id) => id !== mutation.id);
				}
				break;

			case "reorder": {
				const order = normalizeTerrainBrushLibraryOrder(content.order, content.brushes);
				const present = new Set(order);

				const wanted: string[] = [];
				const wantedSet = new Set<string>();
				for (const id of mutation.order) {
					if (present.has(id) && !wantedSet.has(id)) {
						wantedSet.add(id);
						wanted.push(id);
					}
				}

				let next = 0;
				content.order = order.map((id) => (wantedSet.has(id) ? wanted[next++] : id));
				break;
			}
		}
	}

	content.order = normalizeTerrainBrushLibraryOrder(content.order, content.brushes);
	return content;
}

/**
 * Text of library.json (§6.9): version, brushes, complete order and built-in defaults, tab-indented.
 * @param content defines the content to serialize.
 */
export function serializeTerrainBrushLibraryContent(content: ITerrainBrushLibraryContent): string {
	const builtinDefaults: Record<string, TerrainLibraryBrushDefaults> = {};
	for (const builtin of TERRAIN_BUILTIN_BRUSHES) {
		const defaults = content.builtinDefaults[builtin.id];
		if (defaults) {
			builtinDefaults[builtin.id] = { ...defaults };
		}
	}

	const json = {
		version: TERRAIN_BRUSH_LIBRARY_VERSION,
		brushes: content.brushes.map((brush) => ({
			id: brush.id,
			name: brush.name,
			path: brush.path,
			channel: brush.channel,
			invert: brush.invert,
			defaults: brush.defaults ? { ...brush.defaults } : null,
			favorite: brush.favorite,
		})),
		order: normalizeTerrainBrushLibraryOrder(content.order, content.brushes),
		builtinDefaults,
	};

	return `${JSON.stringify(json, null, "\t")}\n`;
}

/**
 * Keeps the known numeric defaults (radius > 0, strength 0..1, hardness 0..0.95, spacing 0.02..2, finite rotation and stamp height);
 * null when none is valid.
 * @param value defines the value to sanitize.
 */
export function sanitizeTerrainBrushDefaults(value: unknown): TerrainLibraryBrushDefaults | null {
	if (!isTerrainRecord(value)) {
		return null;
	}

	const result: TerrainLibraryBrushDefaults = {};
	for (const key of TERRAIN_BRUSH_DEFAULT_KEYS) {
		const raw = value[key];
		if (typeof raw !== "number" || !Number.isFinite(raw)) {
			continue;
		}

		switch (key) {
			case "radius":
				if (raw > 0) {
					result.radius = raw;
				}
				break;
			case "strength":
				result.strength = Math.min(1, Math.max(0, raw));
				break;
			case "hardness":
				result.hardness = Math.min(0.95, Math.max(0, raw));
				break;
			case "spacing":
				if (raw > 0) {
					result.spacing = Math.min(2, Math.max(0.02, raw));
				}
				break;
			default:
				result[key] = raw;
				break;
		}
	}

	return Object.keys(result).length ? result : null;
}

/**
 * Brush library of the project: <project>/terrain-brushes/library.json + images (§1.9, §6.9).
 * Every mutation is serialized (one at a time, in call order), applied in memory at once and written to library.json 300 ms after the
 * last change (atomic write, merged with the changes other editor windows made meanwhile). The file is watched to reload those changes.
 * Paths are resolved through resolveRenamedAssetPath whenever they are read, so renamed assets keep working before the next save.
 * addFiles doesn't toast: its caller reports the result with the §1.9 toasts (the rejection reasons are the user-facing messages:
 * TERRAIN_BRUSH_EXR_MESSAGE, "Unsupported brush file: {name}", "Can't read {name}: {reason}"). relink/replaceImage throw errors with
 * user-facing messages. The library itself only toasts what no caller can report: a corrupt library.json reset at load
 * (toast.library-reset), the fallback of an unreadable brush to "Soft round" (resolveShape), write and trash failures.
 */
export class TerrainBrushLibrary {
	private static _instance: TerrainBrushLibrary | null = null;

	/**
	 * Returns the library of the editor process.
	 */
	public static Get(): TerrainBrushLibrary {
		TerrainBrushLibrary._instance ??= new TerrainBrushLibrary();
		return TerrainBrushLibrary._instance;
	}

	/** Notified after every change of the brushes (local edits, reload of library.json, file changes, missing state, project change). */
	public readonly onChangedObservable: Observable<void> = new Observable<void>();

	private _projectDirectory: string | null = null;
	private _requestedDirectory: string | null = null;
	private _loadRequested: boolean = false;
	private _loadPromise: Promise<void> = Promise.resolve();
	private _operations: Promise<unknown> = Promise.resolve();
	private _generation: number = 0;
	private _disposed: boolean = false;

	/** library.json as last read from or written to disk, and its text. */
	private _base: ITerrainBrushLibraryContent = createEmptyTerrainBrushLibraryContent();
	private _baseText: string | null = null;
	/** Local mutations not written yet. */
	private _pending: TerrainBrushLibraryMutation[] = [];
	/** _base + _pending: what the library shows. */
	private _content: ITerrainBrushLibraryContent = createEmptyTerrainBrushLibraryContent();

	private _writeTimer: ReturnType<typeof setTimeout> | null = null;
	private _writes: Promise<void> = Promise.resolve();

	private _watcher: ReturnType<typeof watch> | null = null;
	private _watchedPath: string | null = null;
	private _watchTimer: ReturnType<typeof setTimeout> | null = null;

	private _brushes: ITerrainLibraryBrush[] | null = null;
	/** Resolved path of each image brush in _brushes (rename detection). */
	private _brushPaths: Map<string, string> = new Map();
	/** Missing state by resolved path: the file doesn't exist, or its current version can't be decoded. */
	private _missing: Map<string, boolean> = new Map();
	private _missingCheckTime: number = 0;
	/** "path|mtime" of the image versions that failed to decode. */
	private _undecodable: Set<string> = new Set();

	/** LRU of decoded masks, key "path|mtime|channel|invert|resolution". */
	private _masks: Map<string, Promise<ITerrainBrushMask>> = new Map();
	/** Thumbnails of image brushes, key "path|mtime|channel|invert". */
	private _thumbnails: Map<string, Promise<ITerrainBrushThumbnailResult>> = new Map();
	private _thumbnailUrls: Map<string, string> = new Map();
	private _builtinThumbnails: Map<string, Promise<string | null>> = new Map();
	/** md5 of image files, key "absolutePath|mtime|size". */
	private _md5: Map<string, Promise<string | null>> = new Map();
	/** "id|path" of the brushes whose fallback to builtin:round was already reported. */
	private _fallbackWarnings: Set<string> = new Set();

	/** Loads <project>/terrain-brushes/library.json (idempotent per directory; resets caches on project change; starts watching the file). */
	public load(projectDirectory: string | null): Promise<void> {
		const directory = normalizeTerrainDirectory(projectDirectory);
		if (this._loadRequested && directory === this._requestedDirectory) {
			return this._loadPromise;
		}

		this._loadRequested = true;
		this._requestedDirectory = directory;
		this._loadPromise = this._enqueue(() => this._load(directory));

		return this._loadPromise;
	}

	/**
	 * Display order: favourites first (in `order` sequence), then every other brush, built-ins and images interleaved, in `order` sequence (§6.9).
	 * Before the first load completes only the built-ins are listed; reading it starts that load (for the opened project) when nobody did,
	 * and onChangedObservable is notified when it completes.
	 */
	public get brushes(): ReadonlyArray<ITerrainLibraryBrush> {
		this._requestLoad();
		this._refreshIfStale();
		this._brushes ??= this._computeBrushes();

		return this._brushes;
	}

	public getBrush(id: string): ITerrainLibraryBrush | null {
		return this.brushes.find((brush) => brush.id === id) ?? null;
	}

	/**
	 * Dedupes (resolved path, then md5 for copies) and detects the channel (§1.9). duplicates = existing brushes matched instead of added.
	 * Files of <project>/terrain-brushes/ and <project>/assets/ are referenced in place, others are copied into terrain-brushes/. A relative
	 * path is resolved against the project directory. No toast: the caller reports added, duplicates and rejected[].reason (§1.9 messages).
	 */
	public addFiles(absolutePaths: string[]): Promise<{ added: ITerrainLibraryBrush[]; duplicates: ITerrainLibraryBrush[]; rejected: { path: string; reason: string }[] }> {
		this._requestLoad();
		return this._enqueue(() => this._addFiles(absolutePaths ?? []));
	}

	/**
	 * Writes a 16-bit PNG `terrain-brushes/captured-<n>.png` (findAvailableFilename) and adds it (channel luminance) with `defaults`
	 * (sanitized; §4.16: { radius, stampHeight: max − min, rotation: 0 }, so stamping the brush reproduces the captured relief).
	 */
	public addCapturedBrush(image: ITerrainImage, name: string, defaults: TerrainLibraryBrushDefaults | null = null): Promise<ITerrainLibraryBrush> {
		this._requestLoad();
		return this._enqueue(() => this._addCapturedBrush(image, name, defaults));
	}

	public update(id: string, patch: Partial<Pick<ITerrainLibraryBrush, "name" | "channel" | "invert" | "defaults" | "favorite">>): Promise<void> {
		this._requestLoad();
		return this._enqueue(async () => this._update(id, patch));
	}

	/** trashFile: files inside terrain-brushes/ go to the OS trash (editor:trash-items). */
	public remove(id: string, trashFile: boolean): Promise<void> {
		this._requestLoad();
		return this._enqueue(() => this._remove(id, trashFile));
	}

	public relink(id: string, absolutePath: string): Promise<void> {
		this._requestLoad();
		return this._enqueue(() => this._setImage(id, absolutePath));
	}

	/** Same as relink for a brush that is not missing (keeps name, favourite and defaults; OS files copied like addFiles). */
	public replaceImage(id: string, absolutePath: string): Promise<void> {
		this._requestLoad();
		return this._enqueue(() => this._setImage(id, absolutePath));
	}

	/** ids = the full display order of non-favourite brushes (built-ins included); favourites keep their relative order. */
	public reorder(ids: string[]): Promise<void> {
		this._requestLoad();
		return this._enqueue(async () => this._reorder(ids ?? []));
	}

	/**
	 * Rewrites paths through resolveRenamedAssetPath and writes library.json at once (called by saveTerrains before applyAssetsCache clears
	 * the renames). Reads always resolve renames anyway. Not queued behind the other operations (a long import of brushes never delays a
	 * save): only the load comes first, then the paths are rewritten synchronously (the entries added by a running import are made of
	 * existing paths, and a write in progress keeps the new changes pending).
	 */
	public async applyAssetRenames(): Promise<void> {
		this._requestLoad();
		await this._loadPromise;

		await this._applyAssetRenames();
	}

	/** Falls back to builtin:round (with missing = true) when the image can't be decoded. */
	public async resolveShape(id: string, base: { falloff: TerrainFalloff; hardness: number; edgeFalloff: boolean }, resolution?: 256 | 512): Promise<ITerrainBrushShape> {
		this._requestLoad();
		await this._loadPromise;

		const falloff = base?.falloff ?? "smooth";
		const hardness = Number.isFinite(base?.hardness) ? Math.min(0.95, Math.max(0, base.hardness)) : 0;
		const edgeFalloff = base?.edgeFalloff === true;
		const size = resolution === 512 ? 512 : 256;

		if (isTerrainBuiltinBrushId(id)) {
			return createTerrainBuiltinBrushShape(id, falloff, hardness, edgeFalloff, size);
		}

		const entry = this._content.brushes.find((brush) => brush.id === id);
		if (!entry) {
			return createTerrainBuiltinBrushShape(TERRAIN_ROUND_BRUSH_ID, falloff, hardness, edgeFalloff, size);
		}

		const generation = this._generation;
		const path = this._resolveBrushPath(entry.path);

		let mtime: number | null = null;
		try {
			mtime = (await stat(this._toAbsolutePath(path))).mtimeMs;
			const mask = await this._getMask(path, mtime, entry.channel, entry.invert, size);

			if (generation === this._generation) {
				this._undecodable.delete(`${path}|${mtime}`);
				this._fallbackWarnings.delete(`${entry.id}|${path}`);
				this._setMissing(path, false, generation);
			}

			return { id: entry.id, kind: "image", mask, falloff, hardness, edgeFalloff };
		} catch (e) {
			if (generation === this._generation) {
				if (mtime !== null) {
					this._undecodable.add(`${path}|${mtime}`);
				}

				this._setMissing(path, true, generation);

				const warningKey = `${entry.id}|${path}`;
				if (!this._fallbackWarnings.has(warningKey)) {
					this._fallbackWarnings.add(warningKey);
					toast.warning(`Brush “${entry.name}” can't be read (${getTerrainBrushErrorReason(e)}): “Soft round” is used instead.`, {
						id: `terrain-brush-fallback-${entry.id}`,
					});
				}
			}

			return createTerrainBuiltinBrushShape(TERRAIN_ROUND_BRUSH_ID, falloff, hardness, edgeFalloff, size);
		}
	}

	/** Cached by path + mtime. */
	public async getThumbnailUrl(id: string): Promise<string | null> {
		this._requestLoad();
		await this._loadPromise;

		if (isTerrainBuiltinBrushId(id)) {
			return this._getBuiltinThumbnailUrl(id);
		}

		for (let attempt = 0; attempt < 3; ++attempt) {
			const entry = this._content.brushes.find((brush) => brush.id === id);
			if (!entry) {
				return null;
			}

			const generation = this._generation;
			const path = this._resolveBrushPath(entry.path);

			let mtime: number;
			try {
				mtime = (await stat(this._toAbsolutePath(path))).mtimeMs;
			} catch (e) {
				this._setMissing(path, true, generation);
				return null;
			}

			const key = `${path}|${mtime}|${entry.channel}|${entry.invert ? 1 : 0}`;
			const promise = this._getImageThumbnail(key, path, mtime, entry.channel, entry.invert);
			const result = await promise;

			if (generation !== this._generation) {
				return null;
			}

			// Invalidated while it was being created (its URL was revoked): try again with the current state.
			if (this._thumbnails.get(key) !== promise) {
				continue;
			}

			// Only the decoding decides whether the brush is missing, like resolveShape (other failures leave the state as is).
			if (result.url) {
				this._undecodable.delete(`${path}|${mtime}`);
				this._setMissing(path, false, generation);
			} else if (result.decodeFailed) {
				this._undecodable.add(`${path}|${mtime}`);
				this._setMissing(path, true, generation);
			}

			return result.url;
		}

		return null;
	}

	/** Drops the cached masks and thumbnail of brushes using this project-relative path (file changed on disk, §6.10). */
	public handleFileChanged(relativePath: string): void {
		try {
			if (typeof relativePath !== "string" || !relativePath) {
				return;
			}

			let path = relativePath.replace(/\\/g, "/");
			if (isTerrainAbsolutePath(path) && this._projectDirectory) {
				path = getTerrainRelativePath(this._projectDirectory, path) ?? path;
			}

			this._dropCachesForPath(path);

			const affected = this._content.brushes.filter((entry) => isSameTerrainPath(this._resolveBrushPath(entry.path), path));
			if (!affected.length) {
				return;
			}

			affected.forEach((entry) => this._clearFallbackWarnings(entry.id));

			this._invalidate();
			this._notify();
		} catch (e) {
			console.error(e);
		}
	}

	/**
	 * Writes the pending changes now instead of waiting for the debounce, and resolves when library.json is up to date
	 * (rejects when the write failed; the changes stay pending).
	 */
	public flushAsync(): Promise<void> {
		return this._flushWrites();
	}

	/**
	 * Stops watching the file, cancels the pending write (call flushAsync first to keep it), revokes the thumbnail URLs and clears the caches.
	 * Get() returns a new library afterwards.
	 */
	public dispose(): void {
		this._disposed = true;
		++this._generation;

		this._stopWatching();
		this._clearTimers();
		this._clearCaches(true);

		this.onChangedObservable.clear();

		if (TerrainBrushLibrary._instance === this) {
			TerrainBrushLibrary._instance = null;
		}
	}

	/**
	 * Loads the library of the opened project when load() was never called (explicit loads always win). Nothing happens while no project
	 * is open, so a later call still loads the project once it is.
	 */
	private _requestLoad(): void {
		if (this._loadRequested || this._disposed) {
			return;
		}

		const directory = getProjectDirectory();
		if (directory) {
			void this.load(directory);
		}
	}

	private _enqueue<T>(operation: () => Promise<T>): Promise<T> {
		const result = this._operations.then(() => operation());
		this._operations = result.catch(() => undefined);

		return result;
	}

	private async _load(directory: string | null): Promise<void> {
		try {
			try {
				await this._flushWrites();
			} catch (e) {
				// Reported by the write: the changes of the previous project are lost.
			}

			this._reset(directory);
			const generation = this._generation;

			if (directory && !this._disposed) {
				const file = await this._readLibraryFile(directory, "load");
				if (generation !== this._generation) {
					return;
				}

				this._base = file.content;
				this._baseText = file.text;
				this._content = cloneTerrainBrushLibraryContent(file.content);

				await this._refreshMissingAsync(generation);
				await this._applyAssetRenames();

				this._startWatching();
			}

			this._invalidate();
			this._notify();
		} catch (e) {
			console.error(`[Terrain] Can't load the brush library: ${getTerrainBrushErrorMessage(e)}`);
		}
	}

	private _reset(directory: string | null): void {
		++this._generation;

		this._stopWatching();
		this._clearTimers();

		this._projectDirectory = directory;
		this._base = createEmptyTerrainBrushLibraryContent();
		this._baseText = null;
		this._pending = [];
		this._content = createEmptyTerrainBrushLibraryContent();

		this._clearCaches(false);
		this._invalidate();
	}

	private async _readLibraryFile(directory: string, mode: TerrainBrushLibraryReadMode): Promise<ITerrainBrushLibraryFile> {
		const path = getTerrainBrushLibraryPath(directory);

		let text: string;
		try {
			text = await readFile(path, "utf-8");
		} catch (e) {
			if (isTerrainMissingFileError(e)) {
				return { content: createEmptyTerrainBrushLibraryContent(), text: null, corrupt: false };
			}

			throw e;
		}

		let parsed: ReturnType<typeof parseTerrainBrushLibraryContent> = null;
		try {
			parsed = parseTerrainBrushLibraryContent(JSON.parse(text.charCodeAt(0) === 0xfeff ? text.substring(1) : text));
		} catch (e) {
			parsed = null;
		}

		if (!parsed) {
			if (mode === "watch") {
				console.warn(`[Terrain] ${path} can't be parsed: the brush library keeps its current content.`);
				return { content: createEmptyTerrainBrushLibraryContent(), text, corrupt: true };
			}

			await backupTerrainBrushLibraryFile(path);

			if (mode === "load") {
				toast.warning(TERRAIN_LIBRARY_RESET_MESSAGE);
				return { content: createEmptyTerrainBrushLibraryContent(), text: null, corrupt: false };
			}

			console.warn(`[Terrain] ${path} was corrupt: it has been backed up and rewritten.`);
			return { content: createEmptyTerrainBrushLibraryContent(), text: null, corrupt: true };
		}

		if (parsed.invalidEntries > 0) {
			console.warn(`[Terrain] Brush library: ${parsed.invalidEntries} invalid entr${parsed.invalidEntries === 1 ? "y" : "ies"} skipped.`);
		}

		return { content: parsed.content, text, corrupt: false };
	}

	private _flushWrites(): Promise<void> {
		if (this._writeTimer) {
			clearTimeout(this._writeTimer);
			this._writeTimer = null;
		}

		const run = (): Promise<void> => this._write();
		this._writes = this._writes.then(run, run);

		return this._writes;
	}

	private _scheduleWrite(): void {
		if (!this._projectDirectory || this._disposed) {
			return;
		}

		if (this._writeTimer) {
			clearTimeout(this._writeTimer);
		}

		this._writeTimer = setTimeout(() => {
			this._writeTimer = null;
			this._flushWrites().catch(() => {
				// Reported by the write; the changes stay pending until the next change.
			});
		}, TERRAIN_BRUSH_LIBRARY_WRITE_DELAY_MS);
	}

	private async _write(): Promise<void> {
		const directory = this._projectDirectory;
		const generation = this._generation;
		const mutations = this._pending.slice();

		if (!directory || !mutations.length || this._disposed) {
			return;
		}

		try {
			const file = await this._readLibraryFile(directory, "write");
			const base = file.corrupt ? cloneTerrainBrushLibraryContent(this._base) : file.content;

			const next = applyTerrainBrushLibraryMutations(base, mutations);
			const text = serializeTerrainBrushLibraryContent(next);

			await writeTerrainFileAtomically(getTerrainBrushLibraryPath(directory), text);

			if (generation !== this._generation) {
				return;
			}

			this._pending.splice(0, mutations.length);
			this._base = next;
			this._baseText = text;

			this._setContent(applyTerrainBrushLibraryMutations(cloneTerrainBrushLibraryContent(next), this._pending));
			this._ensureWatchTarget();
		} catch (e) {
			toast.error(`Failed to write the brush library: ${getTerrainBrushErrorMessage(e)}`, {
				id: "terrain-brush-library-write",
			});

			throw e;
		}
	}

	private _setContent(content: ITerrainBrushLibraryContent): void {
		const changed = serializeTerrainBrushLibraryContent(content) !== serializeTerrainBrushLibraryContent(this._content);
		this._content = content;

		if (changed) {
			this._invalidate();
			this._notify();
		}
	}

	private _commitLocalMutation(mutation: TerrainBrushLibraryMutation): boolean {
		const next = applyTerrainBrushLibraryMutations(cloneTerrainBrushLibraryContent(this._content), [mutation]);
		if (serializeTerrainBrushLibraryContent(next) === serializeTerrainBrushLibraryContent(this._content)) {
			return false;
		}

		this._pending.push(mutation);
		this._content = next;

		this._invalidate();
		this._scheduleWrite();

		return true;
	}

	private _startWatching(): void {
		this._stopWatching();

		const directory = this._projectDirectory;
		if (!directory || this._disposed) {
			return;
		}

		const folder = join(directory, TERRAIN_BRUSHES_FOLDER);
		const folderExists = isTerrainDirectory(folder);
		const target = folderExists ? folder : directory;

		try {
			const watcher = watch(target, { persistent: false }, (_event, filename) => {
				try {
					this._handleWatchEvent(folderExists, filename ? String(filename).replace(/\\/g, "/") : null);
				} catch (e) {
					console.error(e);
				}
			});

			watcher.on("error", () => {
				try {
					if (this._watcher === watcher) {
						this._stopWatching();
					}
				} catch (e) {
					// Nothing to do: the library works without watching.
				}
			});

			this._watcher = watcher;
			this._watchedPath = target;
		} catch (e) {
			this._watcher = null;
			this._watchedPath = null;
		}
	}

	private _stopWatching(): void {
		if (this._watchTimer) {
			clearTimeout(this._watchTimer);
			this._watchTimer = null;
		}

		try {
			this._watcher?.close();
		} catch (e) {
			// Already closed.
		}

		this._watcher = null;
		this._watchedPath = null;
	}

	private _ensureWatchTarget(): void {
		const directory = this._projectDirectory;
		if (!directory || this._disposed) {
			return;
		}

		const folder = join(directory, TERRAIN_BRUSHES_FOLDER);
		const target = isTerrainDirectory(folder) ? folder : directory;
		if (!this._watcher || this._watchedPath !== target) {
			this._startWatching();
		}
	}

	private _handleWatchEvent(folderWatched: boolean, filename: string | null): void {
		if (this._disposed) {
			return;
		}

		// Only library.json matters (images are cached by path + mtime, so a changed image is decoded again anyway), and in the project
		// directory, the creation or deletion of the terrain-brushes folder. A null filename (some platforms) reloads to be safe.
		const expected = folderWatched ? TERRAIN_BRUSH_LIBRARY_FILE : TERRAIN_BRUSHES_FOLDER;
		if (filename && filename !== expected) {
			return;
		}

		if (this._watchTimer) {
			clearTimeout(this._watchTimer);
		}

		this._watchTimer = setTimeout(() => {
			this._watchTimer = null;
			this._enqueue(() => this._reloadFromDisk()).catch((e) => {
				console.error(`[Terrain] Can't reload the brush library: ${getTerrainBrushErrorMessage(e)}`);
			});
		}, TERRAIN_BRUSH_LIBRARY_WATCH_DELAY_MS);
	}

	private async _reloadFromDisk(): Promise<void> {
		const directory = this._projectDirectory;
		const generation = this._generation;
		if (!directory || this._disposed) {
			return;
		}

		this._ensureWatchTarget();

		const file = await this._readLibraryFile(directory, "watch");
		if (generation !== this._generation || file.corrupt || file.text === this._baseText) {
			return;
		}

		this._base = file.content;
		this._baseText = file.text;

		await this._refreshMissingAsync(generation);
		if (generation !== this._generation) {
			return;
		}

		this._setContent(applyTerrainBrushLibraryMutations(cloneTerrainBrushLibraryContent(file.content), this._pending));
	}

	private _computeBrushes(): ITerrainLibraryBrush[] {
		const content = this._content;
		const entries = new Map(content.brushes.map((entry) => [entry.id, entry]));

		this._brushPaths.clear();

		const brushes: ITerrainLibraryBrush[] = [];
		for (const id of getTerrainBrushLibraryDisplayOrder(content)) {
			const builtin = TERRAIN_BUILTIN_BRUSHES.find((brush) => brush.id === id);
			if (builtin) {
				const defaults = content.builtinDefaults[id];
				brushes.push({
					id,
					name: builtin.name,
					builtin: true,
					path: null,
					channel: "luminance",
					invert: false,
					defaults: defaults ? { ...defaults } : null,
					favorite: false,
					missing: false,
				});
				continue;
			}

			const entry = entries.get(id);
			if (!entry) {
				continue;
			}

			const path = this._resolveBrushPath(entry.path);
			this._brushPaths.set(id, path);

			brushes.push({
				id,
				name: entry.name,
				builtin: false,
				path,
				channel: entry.channel,
				invert: entry.invert,
				defaults: entry.defaults ? { ...entry.defaults } : null,
				favorite: entry.favorite,
				missing: this._isMissing(path),
			});
		}

		return brushes;
	}

	private _refreshIfStale(): void {
		if (!this._brushes) {
			return;
		}

		for (const entry of this._content.brushes) {
			if (this._resolveBrushPath(entry.path) !== this._brushPaths.get(entry.id)) {
				this._brushes = null;
				return;
			}
		}

		const now = Date.now();
		if (now - this._missingCheckTime < TERRAIN_BRUSH_MISSING_CHECK_INTERVAL_MS) {
			return;
		}

		this._missingCheckTime = now;
		for (const path of this._brushPaths.values()) {
			const missing = this._checkMissingSync(path);
			if (this._missing.get(path) !== missing) {
				this._missing.set(path, missing);
				this._brushes = null;
			}
		}
	}

	private async _refreshMissingAsync(generation: number): Promise<void> {
		const paths = Array.from(new Set(this._content.brushes.map((entry) => this._resolveBrushPath(entry.path))));
		const missing = await Promise.all(paths.map((path) => this._checkMissingAsync(path)));

		if (generation !== this._generation) {
			return;
		}

		paths.forEach((path, index) => {
			if (this._missing.get(path) !== missing[index]) {
				this._missing.set(path, missing[index]);
				this._invalidate();
			}
		});

		this._missingCheckTime = Date.now();
	}

	private _isMissing(path: string): boolean {
		let missing = this._missing.get(path);
		if (missing === undefined) {
			missing = this._checkMissingSync(path);
			this._missing.set(path, missing);
		}

		return missing;
	}

	private _checkMissingSync(path: string): boolean {
		try {
			const stats = statSync(this._toAbsolutePath(path));
			return !stats.isFile() || this._undecodable.has(`${path}|${stats.mtimeMs}`);
		} catch (e) {
			return true;
		}
	}

	private async _checkMissingAsync(path: string): Promise<boolean> {
		try {
			const stats = await stat(this._toAbsolutePath(path));
			return !stats.isFile() || this._undecodable.has(`${path}|${stats.mtimeMs}`);
		} catch (e) {
			return true;
		}
	}

	private _setMissing(path: string, missing: boolean, generation: number): void {
		if (generation !== this._generation || this._missing.get(path) === missing) {
			return;
		}

		this._missing.set(path, missing);
		this._invalidate();
		this._notify();
	}

	private async _addFiles(absolutePaths: string[]): Promise<ITerrainBrushLibraryAddResult> {
		const result: ITerrainBrushLibraryAddResult = { added: [], duplicates: [], rejected: [] };

		const reject = (path: string, reason: string): void => {
			result.rejected.push({ path, reason });
		};

		const directory = this._projectDirectory;
		for (const input of absolutePaths) {
			if (typeof input !== "string" || !input) {
				continue;
			}

			const absolutePath = toTerrainInputAbsolutePath(input, directory);
			const name = basename(absolutePath);

			const fileError = getTerrainBrushFileError(absolutePath);
			if (fileError) {
				reject(input, fileError);
				continue;
			}

			if (!directory) {
				reject(input, `Can't add ${name}: no project is open.`);
				continue;
			}

			if (!(await isTerrainFile(absolutePath))) {
				reject(input, `Can't read ${name}: file not found`);
				continue;
			}

			const relativePath = getTerrainRelativePath(directory, absolutePath);
			const inPlace = relativePath !== null && isTerrainInPlaceBrushPath(relativePath);

			const duplicate = inPlace ? this._findBrushByResolvedPath(relativePath) : await this._findBrushByMd5(absolutePath);
			if (duplicate) {
				result.duplicates.push(duplicate);
				continue;
			}

			let channel: TerrainLibraryBrushChannel;
			try {
				channel = await detectTerrainBrushChannel(absolutePath);
			} catch (e) {
				reject(input, `Can't read ${name}: ${getTerrainBrushErrorMessage(e)}`);
				continue;
			}

			let path: string;
			try {
				path = inPlace ? relativePath : await this._copyIntoBrushesFolder(absolutePath);
			} catch (e) {
				reject(input, `Can't copy ${name}: ${getTerrainBrushErrorMessage(e)}`);
				continue;
			}

			const entry: ITerrainBrushLibraryEntry = {
				id: this._createBrushId(),
				name: basename(name, extname(name)) || name,
				path,
				channel,
				invert: false,
				defaults: null,
				favorite: false,
			};

			this._commitLocalMutation({ type: "add", entry });
			this._missing.set(path, false);

			const brush = this.getBrush(entry.id);
			if (brush) {
				result.added.push(brush);
			}
		}

		if (result.added.length) {
			this._notify();
		}

		return result;
	}

	private async _addCapturedBrush(image: ITerrainImage, name: string, defaults: TerrainLibraryBrushDefaults | null): Promise<ITerrainLibraryBrush> {
		const directory = this._projectDirectory;
		if (!directory) {
			throw new Error("No project is open: the captured brush can't be saved.");
		}

		const png = await encodeTerrainBrushPng16(image);

		const folder = join(directory, TERRAIN_BRUSHES_FOLDER);
		await ensureDir(folder);

		let index = 1;
		while (
			existsSync(join(folder, `captured-${index}.png`)) ||
			this._content.brushes.some((entry) => isSameTerrainPath(this._resolveBrushPath(entry.path), `${TERRAIN_BRUSHES_FOLDER}/captured-${index}.png`))
		) {
			++index;
		}

		const fileName = `captured-${index}.png`;
		await writeTerrainFileAtomically(join(folder, fileName), png);

		const entry: ITerrainBrushLibraryEntry = {
			id: this._createBrushId(),
			name: (typeof name === "string" && name.trim()) || `Captured ${index}`,
			path: `${TERRAIN_BRUSHES_FOLDER}/${fileName}`,
			channel: "luminance",
			invert: false,
			defaults: sanitizeTerrainBrushDefaults(defaults),
			favorite: false,
		};

		this._commitLocalMutation({ type: "add", entry });
		this._dropCachesForPath(entry.path);
		this._missing.set(entry.path, false);
		this._notify();

		const brush = this.getBrush(entry.id);
		if (!brush) {
			throw new Error("The captured brush couldn't be added to the library.");
		}

		return brush;
	}

	private _update(id: string, patch: Partial<Pick<ITerrainLibraryBrush, "name" | "channel" | "invert" | "defaults" | "favorite">>): void {
		const builtin = isTerrainBuiltinBrushId(id);
		if (!builtin && !this._content.brushes.some((entry) => entry.id === id)) {
			return;
		}

		const sanitized = sanitizeTerrainBrushLibraryPatch(patch, builtin);
		if (!Object.keys(sanitized).length) {
			return;
		}

		if (this._commitLocalMutation({ type: "update", id, patch: sanitized })) {
			if (sanitized.channel !== undefined || sanitized.invert !== undefined) {
				this._clearFallbackWarnings(id);
			}

			this._notify();
		}
	}

	private async _remove(id: string, trashFile: boolean): Promise<void> {
		if (isTerrainBuiltinBrushId(id)) {
			return;
		}

		const entry = this._content.brushes.find((brush) => brush.id === id);
		if (!entry) {
			return;
		}

		const path = this._resolveBrushPath(entry.path);
		const absolutePath = this._toAbsolutePath(path);

		this._commitLocalMutation({ type: "remove", id });
		this._clearFallbackWarnings(id);

		const stillUsed = this._content.brushes.some((other) => isSameTerrainPath(this._resolveBrushPath(other.path), path));
		if (!stillUsed) {
			this._dropCachesForPath(path);
		}

		this._notify();

		// Decided on the resolved absolute path: "terrain-brushes/../x" names a file outside the folder (or the project).
		const relativePath = this._projectDirectory ? getTerrainRelativePath(this._projectDirectory, absolutePath) : null;
		if (!trashFile || stillUsed || !isTerrainBrushTrashablePath(relativePath) || !(await isTerrainFile(absolutePath))) {
			return;
		}

		let trashed = false;
		try {
			trashed = ipcRenderer.sendSync("editor:trash-items", [absolutePath]) === true;
		} catch (e) {
			trashed = false;
		}

		if (!trashed) {
			toast.error(`Can't move “${basename(absolutePath)}” to the trash.`);
		}
	}

	private async _setImage(id: string, input: string): Promise<void> {
		if (isTerrainBuiltinBrushId(id)) {
			throw new Error("Built-in brushes have no image file.");
		}

		const entry = this._content.brushes.find((brush) => brush.id === id);
		if (!entry) {
			throw new Error(`Unknown brush "${id}".`);
		}

		const directory = this._projectDirectory;
		if (!directory) {
			throw new Error("No project is open.");
		}

		if (typeof input !== "string" || !input) {
			throw new Error("No image file given.");
		}

		const absolutePath = toTerrainInputAbsolutePath(input, directory);
		const name = basename(absolutePath);

		const fileError = getTerrainBrushFileError(absolutePath);
		if (fileError) {
			throw new Error(fileError);
		}

		if (!(await isTerrainFile(absolutePath))) {
			throw new Error(`Can't read ${name}: file not found`);
		}

		let channel: TerrainLibraryBrushChannel;
		try {
			channel = await detectTerrainBrushChannel(absolutePath);
		} catch (e) {
			throw new Error(`Can't read ${name}: ${getTerrainBrushErrorMessage(e)}`);
		}

		const relativePath = getTerrainRelativePath(directory, absolutePath);
		const path = relativePath !== null && isTerrainInPlaceBrushPath(relativePath) ? relativePath : await this._copyIntoBrushesFolder(absolutePath);

		const previousPath = this._resolveBrushPath(entry.path);

		// "red" is always a user choice (never detected): it is kept; detected channels follow the new image.
		const patch: TerrainBrushLibraryPatch = { path };
		if (entry.channel !== "red") {
			patch.channel = channel;
		}

		this._commitLocalMutation({ type: "update", id, patch });

		this._dropCachesForPath(previousPath);
		this._dropCachesForPath(path);
		this._missing.set(path, false);
		this._clearFallbackWarnings(id);

		this._invalidate();
		this._notify();
	}

	private _reorder(ids: string[]): void {
		const content = this._content;
		const order = normalizeTerrainBrushLibraryOrder(content.order, content.brushes);
		const favorites = new Set(content.brushes.filter((brush) => brush.favorite).map((brush) => brush.id));
		const known = new Set(order);

		const requested: string[] = [];
		const seen = new Set<string>();
		for (const id of ids) {
			if (typeof id === "string" && known.has(id) && !favorites.has(id) && !seen.has(id)) {
				seen.add(id);
				requested.push(id);
			}
		}

		// Brushes missing from ids keep their relative order after the requested ones.
		for (const id of order) {
			if (!favorites.has(id) && !seen.has(id)) {
				seen.add(id);
				requested.push(id);
			}
		}

		let next = 0;
		const newOrder = order.map((id) => (favorites.has(id) ? id : requested[next++]));

		if (this._commitLocalMutation({ type: "reorder", order: newOrder })) {
			this._notify();
		}
	}

	private async _applyAssetRenames(): Promise<void> {
		if (this._disposed || !this._commitAssetRenames()) {
			return;
		}

		this._notify();

		try {
			await this._flushWrites();
		} catch (e) {
			// Reported by the write; the renamed paths stay pending and are written with the next change.
		}
	}

	/**
	 * Commits (synchronously) the path of every brush renamed or moved since the last save; returns true when a path changed.
	 */
	private _commitAssetRenames(): boolean {
		let changed = false;
		for (const entry of [...this._content.brushes]) {
			if (isTerrainAbsolutePath(entry.path)) {
				continue;
			}

			const resolved = resolveRenamedAssetPath(entry.path);
			if (resolved && resolved !== entry.path) {
				changed = this._commitLocalMutation({ type: "update", id: entry.id, patch: { path: resolved } }) || changed;
			}
		}

		return changed;
	}

	private _findBrushByResolvedPath(relativePath: string): ITerrainLibraryBrush | null {
		const entry = this._content.brushes.find((brush) => isSameTerrainPath(this._resolveBrushPath(brush.path), relativePath));
		return entry ? this.getBrush(entry.id) : null;
	}

	private async _findBrushByMd5(absolutePath: string): Promise<ITerrainLibraryBrush | null> {
		const entries = this._content.brushes.slice();
		if (!entries.length) {
			return null;
		}

		const hash = await this._getMd5(absolutePath);
		if (!hash) {
			return null;
		}

		const hashes = await Promise.all(entries.map((entry) => this._getMd5(this._toAbsolutePath(this._resolveBrushPath(entry.path)))));
		const index = hashes.findIndex((value) => value === hash);

		return index >= 0 ? this.getBrush(entries[index].id) : null;
	}

	private async _getMd5(absolutePath: string): Promise<string | null> {
		let key: string;
		try {
			const stats = await stat(absolutePath);
			if (!stats.isFile()) {
				return null;
			}

			key = `${absolutePath}|${stats.mtimeMs}|${stats.size}`;
		} catch (e) {
			return null;
		}

		let promise = this._md5.get(key);
		if (!promise) {
			promise = computeTerrainFileMd5(absolutePath);
			this._md5.set(key, promise);
		}

		return promise;
	}

	private async _copyIntoBrushesFolder(absolutePath: string): Promise<string> {
		const directory = this._projectDirectory;
		if (!directory) {
			throw new Error("no project is open");
		}

		const folder = join(directory, TERRAIN_BRUSHES_FOLDER);
		await ensureDir(folder);

		const extension = extname(absolutePath);
		const fileName = await findAvailableFilename(folder, basename(absolutePath, extension), extension);
		await copyFile(absolutePath, join(folder, fileName));

		return `${TERRAIN_BRUSHES_FOLDER}/${fileName}`;
	}

	private _createBrushId(): string {
		const used = new Set(this._content.brushes.map((brush) => brush.id));

		let id: string;
		do {
			id = "b-";
			for (let i = 0; i < 8; ++i) {
				id += Math.floor(Math.random() * 16).toString(16);
			}
		} while (used.has(id));

		return id;
	}

	private async _getMask(path: string, mtime: number, channel: TerrainLibraryBrushChannel, invert: boolean, resolution: number): Promise<ITerrainBrushMask> {
		const key = `${path}|${mtime}|${channel}|${invert ? 1 : 0}|${resolution}`;

		let promise = this._masks.get(key);
		if (promise) {
			// Most recently used last.
			this._masks.delete(key);
			this._masks.set(key, promise);

			return promise;
		}

		promise = decodeTerrainBrushMask(this._toAbsolutePath(path), { channel, invert, resolution });
		this._masks.set(key, promise);

		while (this._masks.size > TERRAIN_BRUSH_MASK_CACHE_SIZE) {
			const oldest = this._masks.keys().next().value;
			if (oldest === undefined) {
				break;
			}

			this._masks.delete(oldest);
		}

		try {
			return await promise;
		} catch (e) {
			if (this._masks.get(key) === promise) {
				this._masks.delete(key);
			}

			throw e;
		}
	}

	private _getImageThumbnail(key: string, path: string, mtime: number, channel: TerrainLibraryBrushChannel, invert: boolean): Promise<ITerrainBrushThumbnailResult> {
		const existing = this._thumbnails.get(key);
		if (existing) {
			return existing;
		}

		// The file changed: drop the thumbnails of its previous versions.
		for (const otherKey of Array.from(this._thumbnails.keys())) {
			if (isTerrainCacheKeyOfPath(otherKey, path) && !otherKey.startsWith(`${path}|${mtime}|`)) {
				this._removeThumbnail(otherKey);
			}
		}

		const promise: Promise<ITerrainBrushThumbnailResult> = createTerrainBrushThumbnail(this._toAbsolutePath(path), channel, invert).then((result) => {
			if (result.url && this._thumbnails.get(key) === promise) {
				this._thumbnailUrls.set(key, result.url);
			} else if (result.url) {
				URL.revokeObjectURL(result.url);
			}

			return result;
		});

		this._thumbnails.set(key, promise);
		return promise;
	}

	private _getBuiltinThumbnailUrl(id: string): Promise<string | null> {
		let promise = this._builtinThumbnails.get(id);
		if (!promise) {
			promise = createTerrainBuiltinBrushThumbnailUrl(id).catch(() => null);
			this._builtinThumbnails.set(id, promise);
		}

		return promise;
	}

	private _removeThumbnail(key: string): void {
		const url = this._thumbnailUrls.get(key);
		if (url) {
			URL.revokeObjectURL(url);
		}

		this._thumbnailUrls.delete(key);
		this._thumbnails.delete(key);
	}

	private _dropCachesForPath(path: string): void {
		for (const key of Array.from(this._masks.keys())) {
			if (isTerrainCacheKeyOfPath(key, path)) {
				this._masks.delete(key);
			}
		}

		for (const key of Array.from(this._thumbnails.keys())) {
			if (isTerrainCacheKeyOfPath(key, path)) {
				this._removeThumbnail(key);
			}
		}

		const absolutePath = this._toAbsolutePath(path);
		for (const key of Array.from(this._md5.keys())) {
			if (isTerrainCacheKeyOfPath(key, absolutePath)) {
				this._md5.delete(key);
			}
		}

		for (const key of Array.from(this._undecodable)) {
			if (isTerrainCacheKeyOfPath(key, path)) {
				this._undecodable.delete(key);
			}
		}

		for (const key of Array.from(this._missing.keys())) {
			if (isSameTerrainPath(key, path)) {
				this._missing.delete(key);
			}
		}
	}

	private _clearFallbackWarnings(id: string): void {
		for (const key of Array.from(this._fallbackWarnings)) {
			if (key.startsWith(`${id}|`)) {
				this._fallbackWarnings.delete(key);
			}
		}
	}

	private _clearCaches(includeBuiltinThumbnails: boolean): void {
		this._masks.clear();
		this._md5.clear();
		this._missing.clear();
		this._undecodable.clear();
		this._fallbackWarnings.clear();

		for (const key of Array.from(this._thumbnails.keys())) {
			this._removeThumbnail(key);
		}

		if (includeBuiltinThumbnails) {
			const builtinThumbnails = Array.from(this._builtinThumbnails.values());
			this._builtinThumbnails.clear();

			builtinThumbnails.forEach((promise) => {
				promise.then(
					(url) => url && URL.revokeObjectURL(url),
					() => undefined
				);
			});
		}
	}

	private _clearTimers(): void {
		if (this._writeTimer) {
			clearTimeout(this._writeTimer);
			this._writeTimer = null;
		}

		if (this._watchTimer) {
			clearTimeout(this._watchTimer);
			this._watchTimer = null;
		}
	}

	private _resolveBrushPath(path: string): string {
		if (isTerrainAbsolutePath(path)) {
			return path;
		}

		return resolveRenamedAssetPath(path) || path;
	}

	private _toAbsolutePath(path: string): string {
		if (isTerrainAbsolutePath(path) || !this._projectDirectory) {
			return path;
		}

		return join(this._projectDirectory, path);
	}

	private _invalidate(): void {
		this._brushes = null;
	}

	private _notify(): void {
		if (this._disposed) {
			return;
		}

		try {
			this.onChangedObservable.notifyObservers();
		} catch (e) {
			console.error(e);
		}
	}
}

function parseTerrainBrushLibraryEntry(item: unknown): ITerrainBrushLibraryEntry | null {
	if (!isTerrainRecord(item)) {
		return null;
	}

	const id = item.id;
	if (typeof id !== "string" || !TERRAIN_BRUSH_ID_PATTERN.test(id)) {
		return null;
	}

	let rawPath =
		typeof item.path === "string"
			? item.path
					.trim()
					.replace(/\\/g, "/")
					.replace(/^(\.\/)+/, "")
			: "";

	// Relative paths are normalized: "terrain-brushes/../x.png" is stored (and shown) as the "x.png" it names.
	if (rawPath && !isTerrainAbsolutePath(rawPath)) {
		rawPath = normalize(rawPath);
	}

	if (!rawPath || rawPath === ".") {
		return null;
	}

	const name = typeof item.name === "string" && item.name.trim() ? item.name.trim() : basename(rawPath, extname(rawPath));

	return {
		id,
		name,
		path: rawPath,
		channel: isTerrainBrushChannel(item.channel) ? item.channel : "luminance",
		invert: item.invert === true,
		defaults: sanitizeTerrainBrushDefaults(item.defaults),
		favorite: item.favorite === true,
	};
}

function sanitizeTerrainBrushLibraryPatch(patch: unknown, builtin: boolean): TerrainBrushLibraryPatch {
	const result: TerrainBrushLibraryPatch = {};
	if (!isTerrainRecord(patch)) {
		return result;
	}

	if (patch.defaults !== undefined) {
		result.defaults = sanitizeTerrainBrushDefaults(patch.defaults);
	}

	// Built-ins only store their defaults (builtinDefaults of library.json).
	if (builtin) {
		return result;
	}

	if (typeof patch.name === "string" && patch.name.trim()) {
		result.name = patch.name.trim();
	}

	if (isTerrainBrushChannel(patch.channel)) {
		result.channel = patch.channel;
	}

	if (typeof patch.invert === "boolean") {
		result.invert = patch.invert;
	}

	if (typeof patch.favorite === "boolean") {
		result.favorite = patch.favorite;
	}

	return result;
}

function applyTerrainBrushLibraryPatch(entry: ITerrainBrushLibraryEntry, patch: TerrainBrushLibraryPatch): void {
	if (patch.name !== undefined) {
		entry.name = patch.name;
	}

	if (patch.path !== undefined) {
		entry.path = patch.path;
	}

	if (patch.channel !== undefined) {
		entry.channel = patch.channel;
	}

	if (patch.invert !== undefined) {
		entry.invert = patch.invert;
	}

	if (patch.defaults !== undefined) {
		entry.defaults = patch.defaults ? { ...patch.defaults } : null;
	}

	if (patch.favorite !== undefined) {
		entry.favorite = patch.favorite;
	}
}

function cloneTerrainBrushLibraryEntry(entry: ITerrainBrushLibraryEntry): ITerrainBrushLibraryEntry {
	return {
		...entry,
		defaults: entry.defaults ? { ...entry.defaults } : null,
	};
}

function cloneTerrainBrushLibraryContent(content: ITerrainBrushLibraryContent): ITerrainBrushLibraryContent {
	const builtinDefaults: Record<string, TerrainLibraryBrushDefaults> = {};
	for (const [id, defaults] of Object.entries(content.builtinDefaults)) {
		builtinDefaults[id] = { ...defaults };
	}

	return {
		brushes: content.brushes.map((entry) => cloneTerrainBrushLibraryEntry(entry)),
		order: content.order.slice(),
		builtinDefaults,
	};
}

function isTerrainBrushChannel(value: unknown): value is TerrainLibraryBrushChannel {
	return typeof value === "string" && TERRAIN_BRUSH_CHANNELS.includes(value as TerrainLibraryBrushChannel);
}

function isTerrainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getTerrainBrushLibraryPath(directory: string): string {
	return join(directory, TERRAIN_BRUSHES_FOLDER, TERRAIN_BRUSH_LIBRARY_FILE);
}

async function backupTerrainBrushLibraryFile(path: string): Promise<void> {
	try {
		await rename(path, `${path}.bak-${Date.now()}`);
	} catch (e) {
		console.error(`[Terrain] Can't back up the corrupt brush library ${path}: ${getTerrainBrushErrorMessage(e)}`);
	}
}

async function writeTerrainFileAtomically(path: string, content: string | Buffer): Promise<void> {
	await ensureDir(dirname(path));

	const temporaryPath = `${path}.${process.pid ?? 0}.tmp`;
	try {
		await writeFile(temporaryPath, content);
		await rename(temporaryPath, path);
	} catch (e) {
		try {
			await remove(temporaryPath);
		} catch (removeError) {
			// Nothing left to clean.
		}

		throw e;
	}
}

async function computeTerrainFileMd5(absolutePath: string): Promise<string | null> {
	let timer: ReturnType<typeof setTimeout> | null = null;

	try {
		const timeout = new Promise<null>((resolve) => {
			timer = setTimeout(() => resolve(null), TERRAIN_BRUSH_MD5_TIMEOUT_MS);
		});

		// The md5 worker reads the file itself when it receives a path.
		const hash = await Promise.race([executeSimpleWorker<string>("workers/md5.js", absolutePath as unknown as WorkerMessageData), timeout]);
		return typeof hash === "string" && hash ? hash : null;
	} catch (e) {
		return null;
	} finally {
		if (timer) {
			clearTimeout(timer);
		}
	}
}

async function createTerrainBrushThumbnail(absolutePath: string, channel: TerrainLibraryBrushChannel, invert: boolean): Promise<ITerrainBrushThumbnailResult> {
	let mask: ITerrainBrushMask;
	try {
		mask = await decodeTerrainBrushMask(absolutePath, { channel, invert, resolution: TERRAIN_BRUSH_THUMBNAIL_SIZE });
	} catch (e) {
		return { url: null, decodeFailed: true };
	}

	try {
		return { url: createTerrainPngUrl(await encodeTerrainBrushMaskPng(mask)), decodeFailed: false };
	} catch (e) {
		return { url: null, decodeFailed: false };
	}
}

async function createTerrainBuiltinBrushThumbnailUrl(id: string): Promise<string | null> {
	const size = TERRAIN_BRUSH_THUMBNAIL_SIZE;
	const shape = createTerrainBuiltinBrushShape(id, TERRAIN_BRUSH_THUMBNAIL_FALLOFF, TERRAIN_BRUSH_THUMBNAIL_HARDNESS, false, 256);
	const lut = createTerrainFalloffLut(TERRAIN_BRUSH_THUMBNAIL_FALLOFF, TERRAIN_BRUSH_THUMBNAIL_HARDNESS);

	// Pixel centres in brush space: row 0 = image top = bv +1, column 0 = bu -1.
	const data = new Float32Array(size * size);
	for (let j = 0; j < size; ++j) {
		const bv = 1 - (2 * (j + 0.5)) / size;
		for (let i = 0; i < size; ++i) {
			const bu = -1 + (2 * (i + 0.5)) / size;
			data[j * size + i] = evaluateTerrainBrushShape(shape, lut, bu, bv);
		}
	}

	return createTerrainPngUrl(await encodeTerrainBrushMaskPng({ width: size, height: size, data }));
}

function createTerrainPngUrl(buffer: Buffer): string {
	return URL.createObjectURL(new Blob([new Uint8Array(buffer)], { type: "image/png" }));
}

async function isTerrainFile(absolutePath: string): Promise<boolean> {
	try {
		return (await stat(absolutePath)).isFile();
	} catch (e) {
		return false;
	}
}

function isTerrainDirectory(absolutePath: string): boolean {
	try {
		return existsSync(absolutePath);
	} catch (e) {
		return false;
	}
}

function normalizeTerrainDirectory(directory: string | null): string | null {
	if (typeof directory !== "string" || !directory) {
		return null;
	}

	return trimTerrainTrailingSlashes(normalize(directory.replace(/\\/g, "/")));
}

function trimTerrainTrailingSlashes(path: string): string {
	let end = path.length;
	while (end > 1 && path.charAt(end - 1) === "/" && !/^[A-Za-z]:\/$/.test(path.substring(0, end))) {
		--end;
	}

	return path.substring(0, end);
}

function isTerrainAbsolutePath(path: string): boolean {
	return path.startsWith("/") || /^[A-Za-z]:\//.test(path);
}

function toTerrainInputAbsolutePath(input: string, directory: string | null): string {
	const path = input.replace(/\\/g, "/");
	if (isTerrainAbsolutePath(path) || !directory) {
		return path;
	}

	return join(directory, path);
}

function getTerrainRelativePath(directory: string, absolutePath: string): string | null {
	const root = trimTerrainTrailingSlashes(normalize(directory));
	const path = normalize(absolutePath.replace(/\\/g, "/"));

	const prefix = `${root}/`;
	const inside = process.platform === "win32" ? path.toLowerCase().startsWith(prefix.toLowerCase()) : path.startsWith(prefix);
	if (!inside) {
		return null;
	}

	const relativePath = path.substring(prefix.length);
	return relativePath && relativePath !== ".." && !relativePath.startsWith("../") ? relativePath : null;
}

function isSameTerrainPath(a: string, b: string): boolean {
	return process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function isTerrainCacheKeyOfPath(key: string, path: string): boolean {
	const prefix = `${path}|`;
	return process.platform === "win32" ? key.toLowerCase().startsWith(prefix.toLowerCase()) : key.startsWith(prefix);
}

function isTerrainInPlaceBrushPath(relativePath: string): boolean {
	const path = process.platform === "win32" ? relativePath.toLowerCase() : relativePath;
	return path.startsWith(`${TERRAIN_BRUSHES_FOLDER}/`) || path.startsWith("assets/");
}

function isTerrainBrushesFolderPath(relativePath: string): boolean {
	const path = process.platform === "win32" ? relativePath.toLowerCase() : relativePath;
	return path.startsWith(`${TERRAIN_BRUSHES_FOLDER}/`);
}

function isTerrainMissingFileError(error: unknown): boolean {
	const code = (error as { code?: unknown } | null)?.code;
	return code === "ENOENT" || code === "ENOTDIR";
}

function getTerrainBrushErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function getTerrainBrushErrorReason(error: unknown): string {
	return isTerrainMissingFileError(error) ? "file not found" : getTerrainBrushErrorMessage(error);
}
