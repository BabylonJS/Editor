import { Observable, type Mesh } from "babylonjs";
import { getTerrainMaterialPlugin, type TerrainMaterialPlugin } from "babylonjs-editor-tools";

import type { ITerrainChangedEvent, TerrainChangeKind, TerrainChangeReason } from "./types";

/**
 * Notified after every change of a terrain applied by the engine: strokes, operations, creations, resizes, layers, settings, undo and redo.
 */
export const onTerrainChangedObservable: Observable<ITerrainChangedEvent> = new Observable<ITerrainChangedEvent>();

/** Incremented at each change of the weights, layers or material of a terrain material (caches of the weights, e.g. the layer coverage). */
const weightsVersions = new WeakMap<TerrainMaterialPlugin, number>();

/**
 * Notifies onTerrainChangedObservable (errors of the observers are logged, never thrown).
 * @param mesh defines the terrain that changed.
 * @param kinds defines what changed.
 * @param reason defines why it changed.
 */
export function notifyTerrainChanged(mesh: Mesh, kinds: TerrainChangeKind[], reason: TerrainChangeReason): void {
	if (kinds.includes("weights") || kinds.includes("layers") || kinds.includes("material")) {
		const plugin = getTerrainMaterialPlugin(mesh.material as any);
		if (plugin) {
			weightsVersions.set(plugin, getTerrainWeightsVersion(plugin) + 1);
		}
	}

	try {
		onTerrainChangedObservable.notifyObservers({ mesh, kinds, reason });
	} catch (e) {
		console.error(`[Terrain] ${e instanceof Error ? e.message : String(e)}`);
	}
}

/**
 * Returns the version of the weights of the terrain material, incremented at each change of its weights, layers or material.
 * @param plugin defines the terrain material plugin.
 */
export function getTerrainWeightsVersion(plugin: TerrainMaterialPlugin): number {
	return weightsVersions.get(plugin) ?? 0;
}
