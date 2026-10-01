import type { Mesh } from "babylonjs";

import { toast } from "sonner";

import { registerUndoRedo, stack, type UndoRedoStackItem } from "../../undoredo";

import type { ITerrainUndoPayload } from "../core/types";

import type { TerrainChangeKind } from "./types";

/** Default undo memory budget (§7.2, §7.5). */
export const TERRAIN_DEFAULT_UNDO_BUDGET_BYTES = 512 * 1024 * 1024;

/** toast.undo-expired (§1.17). */
export const TERRAIN_UNDO_EXPIRED_MESSAGE = "This terrain edit can no longer be undone (undo memory limit).";
/** toast.undo-resolution (§1.17). */
export const TERRAIN_UNDO_RESOLUTION_MESSAGE = "This terrain edit can't be undone: the terrain resolution changed.";

export type TerrainUndoDirection = "undo" | "redo";

export interface ITerrainUndoEntryOptions {
	/**
	 * Change kinds notified with the undo/redo besides the kinds of the swapped rects
	 * (e.g. "material", "layers", "grid", "node" for snapshot payloads).
	 */
	kinds?: TerrainChangeKind[];
	/**
	 * true for snapshot payloads (createTerrainSnapshotPayload: resize, layers, material swaps...): applied without
	 * the signature check of tile payloads (their exchange installs a whole state). Default false (tile/full payloads).
	 */
	snapshot?: boolean;
	/**
	 * Called once when the entry is released (budget, stack overflow, redo branch cut, clearUndoRedo), after the payload was released.
	 * `undone` is true when the entry was undone at that moment (e.g. an "Enable texture painting" entry lost while undone disposes its unused material).
	 */
	onRelease?: (undone: boolean) => void;
}

export interface ITerrainUndoEntry {
	readonly mesh: Mesh;
	readonly payload: ITerrainUndoPayload;
	readonly label: string;
	readonly kinds: readonly TerrainChangeKind[];
	readonly snapshot: boolean;
	/** true once released (the payload dropped its data): undoing it shows toast.undo-expired. */
	readonly released: boolean;
	/** true while the entry is undone (between its undo and its redo). */
	readonly undone: boolean;
	/**
	 * true while the payload holds the post-change state (its undo swap was applied). An undo that could not be applied leaves it false,
	 * so the following redo applies nothing either: the payload never gets out of phase with the live data.
	 */
	readonly swapped: boolean;
	/** The configuration registered in the editor undo stack. */
	readonly config: UndoRedoStackItem;
}

/** What the store needs from the terrain engine to apply an entry. */
export interface ITerrainUndoHost {
	/** Live signature of the terrain (`${grid.signature}|${weightMapSize ?? 0}`, §7.1); null when the mesh is no longer a valid terrain. */
	getSignature(mesh: Mesh): string | null;
	/**
	 * Swaps the payload with the live data and processes the result (§7.2): binding.markDirty(changed), synchronous flush + finalize,
	 * weight uploads + mipmaps, dirty-since-save flags, onTerrainChangedObservable with reason "undo"/"redo". Returns false when nothing
	 * could be applied (the store then keeps the payload's phase); any other result (true, or nothing) means the swap was applied.
	 * Called only for unreleased entries of meshes that are not disposed, after the signature check of tile payloads; tile payloads are
	 * swapped with their own signature (see isTerrainUndoSignatureCompatible).
	 */
	apply(entry: ITerrainUndoEntry, direction: TerrainUndoDirection): boolean | void;
	/**
	 * Called before an entry is applied: ends what is in progress on its terrain and returns null, or returns the message of a refusal (the
	 * entry is then left in its phase: the next opposite undo/redo skips it too, so the live data always matches the payloads).
	 */
	prepare(entry: ITerrainUndoEntry): string | null;
}

/**
 * Whether a tile payload captured with `payloadSignature` can be swapped into a terrain whose live signature is `liveSignature` (§7.1):
 * same grid (`${S}:${W}:${H}`) and same weight map size, or a payload captured without weights (`…|0`, the stroke target had no loaded
 * weights: it holds heights/holes tiles only), which applies whatever the weights are now. The journal still checks every resource layout
 * before swapping (nothing is applied partially).
 * @param payloadSignature defines the signature stored in the payload.
 * @param liveSignature defines the signature of the live terrain (null when not a valid terrain).
 */
export function isTerrainUndoSignatureCompatible(payloadSignature: string, liveSignature: string | null): boolean {
	if (liveSignature === null) {
		return false;
	}

	if (payloadSignature === liveSignature) {
		return true;
	}

	const payloadSeparator = payloadSignature.lastIndexOf("|");
	const liveSeparator = liveSignature.lastIndexOf("|");
	if (payloadSeparator === -1 || liveSeparator === -1) {
		return false;
	}

	return payloadSignature.slice(0, payloadSeparator) === liveSignature.slice(0, liveSeparator) && payloadSignature.slice(payloadSeparator + 1) === "0";
}

class TerrainUndoEntry implements ITerrainUndoEntry {
	public released: boolean = false;
	public undone: boolean = false;
	public swapped: boolean = false;
	public config!: UndoRedoStackItem;

	public readonly kinds: readonly TerrainChangeKind[];
	public readonly snapshot: boolean;
	public readonly onRelease: ((undone: boolean) => void) | null;

	public constructor(
		public readonly mesh: Mesh,
		public readonly payload: ITerrainUndoPayload,
		public readonly label: string,
		options: ITerrainUndoEntryOptions
	) {
		this.kinds = options.kinds?.slice() ?? [];
		this.snapshot = options.snapshot ?? false;
		this.onRelease = options.onRelease ?? null;
	}
}

/**
 * Undo payloads of the terrain engine (§7.2): one editor undo entry per stroke or operation, whose undo and redo are the same swap.
 * The store keeps the accounting of the payload memory, releases the entries lost by the editor stack (redo branch cut, clearUndoRedo,
 * entries shifted out beyond 200 without onLost) and, while the memory used exceeds the budget, the oldest entries first.
 */
export class TerrainUndoStore {
	private readonly _host: ITerrainUndoHost;
	private readonly _entries: TerrainUndoEntry[] = [];
	private _budgetBytes: number;

	/**
	 * @param host defines the engine callbacks used to apply the payloads.
	 * @param budgetBytes defines the memory budget of the payloads (default 512 MiB).
	 */
	public constructor(host: ITerrainUndoHost, budgetBytes: number = TERRAIN_DEFAULT_UNDO_BUDGET_BYTES) {
		this._host = host;
		this._budgetBytes = budgetBytes;
	}

	/** Memory budget of the unreleased payloads; setting it releases the oldest entries at once when needed. */
	public get budgetBytes(): number {
		return this._budgetBytes;
	}

	public set budgetBytes(value: number) {
		this._budgetBytes = Math.max(0, Number.isFinite(value) ? value : TERRAIN_DEFAULT_UNDO_BUDGET_BYTES);
		this.sweep();
	}

	/** Sum of the byte lengths of the unreleased payloads. */
	public get usedBytes(): number {
		let bytes = 0;
		for (const entry of this._entries) {
			bytes += entry.payload.byteLength;
		}

		return bytes;
	}

	/** Unreleased entries, oldest first. */
	public get entries(): readonly ITerrainUndoEntry[] {
		return this._entries;
	}

	/**
	 * Registers one editor undo entry whose undo and redo swap the payload (executeRedo false: the change is already applied).
	 * A null payload (nothing changed) registers nothing and returns null.
	 * @param mesh defines the terrain the payload belongs to.
	 * @param payload defines the payload holding the other state (tiles, full or snapshot payload).
	 * @param label defines a short description of the change ("Raise stroke", "Erode all", ...).
	 * @param options defines the notified kinds, the snapshot flag and the release callback.
	 */
	public register(mesh: Mesh, payload: ITerrainUndoPayload | null, label: string, options: ITerrainUndoEntryOptions = {}): ITerrainUndoEntry | null {
		if (!payload) {
			return null;
		}

		const entry = new TerrainUndoEntry(mesh, payload, label, options);
		entry.config = {
			executeRedo: false,
			undo: () => this._apply(entry, "undo"),
			redo: () => this._apply(entry, "redo"),
			onLost: () => this._release(entry),
		};

		this._entries.push(entry);
		registerUndoRedo(entry.config);
		this.sweep();

		return entry;
	}

	/**
	 * Releases the entries that are no longer in the editor undo stack (shifted out beyond 200 entries, which never calls onLost),
	 * then, while the memory used exceeds the budget, the oldest entries. Called after each registration.
	 */
	public sweep(): void {
		const registered = new Set(stack);
		for (const entry of this._entries.slice()) {
			if (!registered.has(entry.config)) {
				this._release(entry);
			}
		}

		while (this._entries.length > 0 && this.usedBytes > this._budgetBytes) {
			this._release(this._entries[0]);
		}
	}

	private _apply(entry: TerrainUndoEntry, direction: TerrainUndoDirection): void {
		const undoing = direction === "undo";

		const refusal = entry.swapped === undoing ? null : this._host.prepare(entry);
		if (refusal) {
			toast.warning(refusal, { id: "terrain-undo-refused" });
			return;
		}

		try {
			// The live data is already in the target state: the opposite swap was not applied (see swapped).
			if (entry.swapped === undoing) {
				return;
			}

			if (entry.released || entry.payload.released) {
				toast.warning(TERRAIN_UNDO_EXPIRED_MESSAGE, { id: "terrain-undo-expired" });
				return;
			}

			if (entry.mesh.isDisposed()) {
				return;
			}

			if (!entry.snapshot && !isTerrainUndoSignatureCompatible(entry.payload.signature, this._host.getSignature(entry.mesh))) {
				toast.error(TERRAIN_UNDO_RESOLUTION_MESSAGE);
				return;
			}

			if (this._host.apply(entry, direction) !== false) {
				entry.swapped = undoing;
			}
		} catch (e) {
			reportUndoError(e);
		} finally {
			entry.undone = undoing;
		}
	}

	private _release(entry: TerrainUndoEntry): void {
		if (entry.released) {
			return;
		}

		entry.released = true;

		const index = this._entries.indexOf(entry);
		if (index !== -1) {
			this._entries.splice(index, 1);
		}

		try {
			entry.payload.release();
		} catch (e) {
			reportUndoError(e);
		}

		try {
			entry.onRelease?.(entry.undone);
		} catch (e) {
			reportUndoError(e);
		}
	}
}

function reportUndoError(error: unknown): void {
	console.error(`[Terrain] Undo/redo failed: ${error instanceof Error ? error.message : String(error)}`);
}
