import { Observable, type Material } from "babylonjs";
import { getTerrainMaterialPlugin } from "babylonjs-editor-tools";

import { createDefaultTerrainToolSettings } from "../../../../tools/terrain/core/settings";
import type { ITerrainToolSettings, TerrainPaintTool } from "../../../../tools/terrain/core/types";

/**
 * Sculpt tools of the inspector, in the order of their keys in the preview (1, 2, 3...). The erode and stamp tools of the engine are not
 * available in the inspector.
 */
export const terrainSculptTools = ["raise", "smooth", "flatten", "set-height", "ramp", "noise", "terrace", "holes"] as const;

export type TerrainInspectorSculptTool = (typeof terrainSculptTools)[number];
export type TerrainInspectorTool = TerrainInspectorSculptTool | TerrainPaintTool;

/**
 * Settings of the terrain tools (mode, tools, brush, filters, view), for the session.
 * The object and its nested objects are never replaced, so they can be bound to the inspector fields.
 */
export const terrainSettings: ITerrainToolSettings = createDefaultTerrainToolSettings();

/**
 * Textures used as custom brushes, for the session: the ones dropped on the "Brush" section. The id of a custom brush is the absolute path
 * of its texture.
 */
export const terrainCustomBrushes: string[] = [];

/**
 * Notified each time the settings change. The value is true when the change was made outside of the settings fields (mode or tool switch,
 * shortcuts, reset...): the fields are keyed by getTerrainSettingsExternalRevision() to be created again with the new values.
 */
export const onTerrainSettingsChangedObservable = new Observable<boolean>();

let externalRevision = 0;

/** Active paint layer per terrain material (Material.uniqueId → layer id), for the session. */
const activeLayerIds = new Map<number, string>();

/**
 * Changes the settings outside of their fields (mode or tool switch, shortcuts, brush defaults...).
 * @param mutator defines the function that changes the settings.
 */
export function updateTerrainSettings(mutator: (settings: ITerrainToolSettings) => void): void {
	mutator(terrainSettings);
	notify(true);
}

/**
 * To call once a field wrote its value in the settings.
 */
export function notifyTerrainSettingsChanged(): void {
	notify(false);
}

/**
 * Returns the number of changes made outside of the settings fields: the key of the fields.
 */
export function getTerrainSettingsExternalRevision(): number {
	return externalRevision;
}

/**
 * Restores the default settings.
 */
export function resetTerrainSettings(): void {
	assignInPlace(terrainSettings, createDefaultTerrainToolSettings());
	notify(true);
}

/**
 * Returns the active paint layer of the given terrain material: the layer selected in the session, else the first layer.
 * @param material defines the material of the terrain.
 */
export function getActiveTerrainLayerId(material: Material | null): string | null {
	const layers = material ? getTerrainMaterialPlugin(material as any)?.data.layers : null;
	if (!material || !layers?.length) {
		return null;
	}

	const layerId = activeLayerIds.get(material.uniqueId);
	return layers.some((layer) => layer.id === layerId) ? layerId! : layers[0].id;
}

/**
 * Sets the active paint layer of the given terrain material.
 * @param material defines the material of the terrain.
 * @param layerId defines the id of the layer to select (null selects the first layer).
 */
export function setActiveTerrainLayerId(material: Material, layerId: string | null): void {
	if ((activeLayerIds.get(material.uniqueId) ?? null) === layerId) {
		return;
	}

	if (layerId) {
		activeLayerIds.set(material.uniqueId, layerId);
	} else {
		activeLayerIds.delete(material.uniqueId);
	}

	notify(false);
}

function notify(external: boolean): void {
	if (external) {
		++externalRevision;
	}

	onTerrainSettingsChangedObservable.notifyObservers(external);
}

/**
 * Makes the target equal to the source, nested objects included: the objects bound to the fields are kept.
 */
function assignInPlace(target: any, source: any): void {
	for (const key of Object.keys(target)) {
		if (!(key in source)) {
			delete target[key];
		}
	}

	for (const key of Object.keys(source)) {
		if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key]) && target[key] && typeof target[key] === "object") {
			assignInPlace(target[key], source[key]);
		} else {
			target[key] = source[key];
		}
	}
}
