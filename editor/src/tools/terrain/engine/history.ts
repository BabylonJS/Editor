import type { Mesh } from "babylonjs";
import { getTerrainMaterialPlugin } from "babylonjs-editor-tools";

import { toast } from "sonner";

import { isTerrainRectEmpty } from "../core/rect";
import type { TerrainRectsByKind, TerrainTileResourceProvider } from "../core/types";

import { markTerrainDependentsChanged } from "./dependents";
import { notifyTerrainChanged } from "./events";
import { getTerrainBinding, getTerrainHeightView, getTerrainUndoSignature, peekTerrainBinding } from "./registry";
import { getActiveTerrainPreview, getActiveTerrainStroke } from "./state";
import { getTerrainChangeKinds, getTerrainRefusalMessage } from "./stroke";
import type { TerrainChangeKind } from "./types";
import { TERRAIN_UNDO_RESOLUTION_MESSAGE, TerrainUndoStore, type ITerrainUndoEntry, type TerrainUndoDirection } from "./undo";
import { isTerrainBusy } from "./yield";

const EMPTY_PROVIDER: TerrainTileResourceProvider = () => null;

let undoStore: TerrainUndoStore | null = null;

/**
 * Returns the undo store of the terrain engine (created on first use): every stroke, operation and mutation registers its editor undo entry
 * through it, which keeps the memory used by the undo payloads under its budget.
 */
export function getTerrainUndoStore(): TerrainUndoStore {
	undoStore ??= new TerrainUndoStore({
		getSignature: (mesh) => getUndoSignature(mesh),
		apply: (entry, direction) => applyUndoEntry(entry, direction),
		prepare: (entry) => prepareUndoEntry(entry),
	});

	return undoStore;
}

/**
 * Before undo/redo of a terrain entry (§7.3): the stroke being drawn and the Generate preview of its terrain are cancelled (they were never
 * committed: they are not in the undo history), and the entry is refused while an operation or an agent edit runs (their start state is
 * captured: nothing may be swapped under them).
 */
function prepareUndoEntry(entry: ITerrainUndoEntry): string | null {
	if (isTerrainBusy()) {
		return getTerrainRefusalMessage("busy");
	}

	const stroke = getActiveTerrainStroke();
	if (stroke?.mesh === entry.mesh) {
		stroke.cancel();
	}

	const preview = getActiveTerrainPreview();
	if (preview?.mesh === entry.mesh) {
		preview.cancel();
	}

	return null;
}

function getUndoSignature(mesh: Mesh): string | null {
	const binding = peekTerrainBinding(mesh);
	if (binding) {
		return binding.signature;
	}

	const view = getTerrainHeightView(mesh);
	return view ? getTerrainUndoSignature(view.grid, getTerrainMaterialPlugin(mesh.material as any)?.data.weightMapSize ?? 0) : null;
}

/**
 * Undo/redo of a terrain entry (§7.2): swap, markDirty, synchronous flush + finalize, one notification. Returns false when nothing was
 * applied. Tile payloads are swapped into the existing binding (even when a clone shares the geometry since the edit: it shares the undo
 * too) with their own signature, already checked compatible by the store (a payload captured without loaded weights ends with "|0").
 */
function applyUndoEntry(entry: ITerrainUndoEntry, direction: TerrainUndoDirection): boolean {
	const mesh = entry.mesh;

	let changed: TerrainRectsByKind;
	if (entry.snapshot) {
		const before = peekTerrainBinding(mesh);
		changed = entry.payload.swap(before?.provider ?? EMPTY_PROVIDER, before?.signature ?? "");
	} else {
		let binding = peekTerrainBinding(mesh);
		if (!binding) {
			const result = getTerrainBinding(mesh);
			if (!result.binding) {
				toast.error(getTerrainRefusalMessage(result.refusal));
				return false;
			}

			binding = result.binding;
		}

		changed = entry.payload.swap(binding.provider, entry.payload.signature);

		// A tile payload always holds tiles: an empty result means a live resource is missing or has another layout (nothing applied).
		if (!hasRects(changed)) {
			toast.error(TERRAIN_UNDO_RESOLUTION_MESSAGE);
			return false;
		}
	}

	const binding = peekTerrainBinding(mesh);
	if (binding && hasRects(changed)) {
		binding.markDirty(changed);
		binding.finalize(changed);
	}

	const kinds = new Set<TerrainChangeKind>(entry.kinds);
	getTerrainChangeKinds(changed).forEach((kind) => kinds.add(kind));

	if (kinds.size) {
		const list = Array.from(kinds);

		// Shadows, decals and collision proxy follow the relief (§6.13); snapshot entries may have replaced the whole grid.
		markTerrainDependentsChanged(mesh, list, entry.snapshot ? null : changed);
		notifyTerrainChanged(mesh, list, direction);
	}

	return true;
}

function hasRects(rects: TerrainRectsByKind): boolean {
	return Object.values(rects).some((rect) => rect && !isTerrainRectEmpty(rect));
}
