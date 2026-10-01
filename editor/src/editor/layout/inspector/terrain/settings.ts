import { Observable, type Material } from "babylonjs";
import { getTerrainMaterialPlugin } from "babylonjs-editor-tools";

import { onProjectConfigurationChangedObservable, projectConfiguration } from "../../../../project/configuration";

import { createDefaultTerrainToolSettings, mergeTerrainToolSettings } from "../../../../tools/terrain/core/settings";
import type { ITerrainToolSettings } from "../../../../tools/terrain/core/types";
import { setTerrainDecalsAutoReprojectEnabled } from "../../../../tools/terrain/engine/preferences";

export interface ITerrainSettingsChange {
	/** Bumped by every change. */
	revision: number;
	/** Bumped only by updateTerrainSettings and resetTerrainSettings (changes made outside the settings fields). */
	externalRevision: number;
	keys: string[];
	/** true for updateTerrainSettings/resetTerrainSettings, false for notifyTerrainSettingsChanged. */
	external: boolean;
}

/** Delay of the debounced persistence in the local storage (ms). */
export const TERRAIN_SETTINGS_PERSIST_DELAY_MS = 300;

/** Key notified by setActiveTerrainLayerId (session state, not persisted). */
export const TERRAIN_ACTIVE_LAYER_SETTINGS_KEY = "activeLayerId";

/** Brush selected in a project that has no stored selection, when the current brush is an image brush of another project. */
const TERRAIN_DEFAULT_BRUSH_ID = "builtin:round";

/**
 * Mutable singleton, lazily loaded from localStorage on first import (mergeTerrainToolSettings).
 * Its identity never changes (resetTerrainSettings mutates it in place, nested objects included), so objects bound to fields
 * (e.g. terrainSettings.brush) stay valid.
 */
export const terrainSettings: ITerrainToolSettings = loadStoredTerrainSettings();

export const onTerrainSettingsChangedObservable: Observable<ITerrainSettingsChange> = new Observable<ITerrainSettingsChange>();

let settingsRevision = 0;
let settingsExternalRevision = 0;
let persistTimeout: ReturnType<typeof setTimeout> | null = null;
/** Project whose brush selection is held by terrainSettings.brush.brushId (null: no project). */
let brushSelectionProjectPath: string | null = null;
/** Active paint layer per terrain material (Material.uniqueId → layer id), for the session. */
const activeTerrainLayerIds: Map<number, string> = new Map<number, string>();

/**
 * Changes made OUTSIDE the settings fields (shortcuts, Ctrl/Cmd+wheel, radial adjust, brush defaults, radius clamp on target change,
 * category switch, MCP): applies the mutator, bumps revision AND externalRevision (fields keyed by it remount and show the new value),
 * notifies, persists (debounced 300 ms; brushId per project).
 */
export function updateTerrainSettings(mutator: (settings: ITerrainToolSettings) => void, keys?: string[]): void {
	mutator(terrainSettings);

	++settingsRevision;
	++settingsExternalRevision;

	notifyTerrainSettingsObservers(keys ?? [], true);
	scheduleTerrainSettingsPersistence();
}

/** Called by a settings field's onChange after the field wrote its own value into terrainSettings: bumps revision only (no remount), notifies, persists (debounced 300 ms). */
export function notifyTerrainSettingsChanged(keys: string[]): void {
	++settingsRevision;

	notifyTerrainSettingsObservers(keys, false);
	scheduleTerrainSettingsPersistence();
}

export function getTerrainSettingsRevision(): number {
	return settingsRevision;
}

export function getTerrainSettingsExternalRevision(): number {
	return settingsExternalRevision;
}

/** Restores createDefaultTerrainToolSettings() (external change). */
export function resetTerrainSettings(): void {
	const defaults = createDefaultTerrainToolSettings();
	assignTerrainSettingsInPlace(terrainSettings as unknown as Record<string, unknown>, defaults as unknown as Record<string, unknown>);

	++settingsRevision;
	++settingsExternalRevision;

	notifyTerrainSettingsObservers(Object.keys(defaults), true);
	scheduleTerrainSettingsPersistence();
}

/**
 * Active paint layer of a terrain material: the layer selected in the session when it still exists, else the first layer.
 * null without a terrain material or layers.
 * @param material defines the terrain material (the terrain's material).
 */
export function getActiveTerrainLayerId(material: Material | null): string | null {
	if (!material) {
		return null;
	}

	const layers = getTerrainMaterialPlugin(material as any)?.data.layers;
	if (!layers?.length) {
		return null;
	}

	const stored = activeTerrainLayerIds.get(material.uniqueId);
	if (stored !== undefined && layers.some((layer) => layer.id === stored)) {
		return stored;
	}

	return layers[0].id;
}

/**
 * Selects the active paint layer of a terrain material (session state). Notifies onTerrainSettingsChangedObservable with the key
 * "activeLayerId" (revision bumped, not externalRevision) when the selection changes.
 * @param material defines the terrain material.
 * @param layerId defines the layer to select (null clears the selection: the first layer becomes active).
 */
export function setActiveTerrainLayerId(material: Material, layerId: string | null): void {
	const previous = activeTerrainLayerIds.get(material.uniqueId) ?? null;

	if (layerId) {
		activeTerrainLayerIds.set(material.uniqueId, layerId);
	} else {
		activeTerrainLayerIds.delete(material.uniqueId);
	}

	if (previous !== layerId) {
		++settingsRevision;
		notifyTerrainSettingsObservers([TERRAIN_ACTIVE_LAYER_SETTINGS_KEY], false);
	}
}

/** Loads the per-project brush id. The module calls it itself: it subscribes to onProjectConfigurationChangedObservable at first import (no other package calls it). */
export function loadTerrainBrushSelection(projectPath: string | null): void {
	// A pending selection of the previous project is written for that project first.
	flushTerrainSettings();

	brushSelectionProjectPath = projectPath || null;
	if (!brushSelectionProjectPath) {
		return;
	}

	const current = terrainSettings.brush.brushId;
	const stored = tryGetTerrainBrushIdFromLocalStorage(brushSelectionProjectPath);

	// Image brushes belong to a project library: a project without a stored selection keeps a built-in brush only.
	const next = stored ?? (current.startsWith("builtin:") ? current : TERRAIN_DEFAULT_BRUSH_ID);

	if (next !== current) {
		updateTerrainSettings(
			(settings) => {
				settings.brush.brushId = next;
			},
			["brush.brushId"]
		);
	}
}

/** Writes a pending debounced persistence at once (window unload, project change); no-op when nothing is pending. */
export function flushTerrainSettings(): void {
	if (persistTimeout === null) {
		return;
	}

	clearTimeout(persistTimeout);
	persistTimeout = null;

	persistTerrainSettings();
}

function loadStoredTerrainSettings(): ITerrainToolSettings {
	try {
		return mergeTerrainToolSettings(tryGetTerrainSettingsFromLocalStorage());
	} catch (e) {
		console.error(e);
		return createDefaultTerrainToolSettings();
	}
}

function notifyTerrainSettingsObservers(keys: string[], external: boolean): void {
	applyTerrainEnginePreferences();

	try {
		onTerrainSettingsChangedObservable.notifyObservers({
			revision: settingsRevision,
			externalRevision: settingsExternalRevision,
			keys: keys.slice(),
			external,
		});
	} catch (e) {
		// A throwing observer must not break the caller (shortcut, field, MCP).
		console.error(e);
	}
}

/**
 * Pushes the settings the engine applies by itself to engine/preferences.ts (the engine may not read terrainSettings, §2.1 rule 2):
 * "Re-project decals after each stroke" (view.autoReprojectDecals, §1.12, §6.13). Called at load and before every change notification,
 * so the value holds for every stroke, MCP strokes included, even while the Terrain tab was never opened.
 */
function applyTerrainEnginePreferences(): void {
	try {
		setTerrainDecalsAutoReprojectEnabled(terrainSettings.view?.autoReprojectDecals ?? true);
	} catch (e) {
		console.error(e);
	}
}

function scheduleTerrainSettingsPersistence(): void {
	if (persistTimeout !== null) {
		clearTimeout(persistTimeout);
	}

	persistTimeout = setTimeout(() => {
		persistTimeout = null;
		persistTerrainSettings();
	}, TERRAIN_SETTINGS_PERSIST_DELAY_MS);
}

function persistTerrainSettings(): void {
	trySetTerrainSettingsInLocalStorage(terrainSettings);

	if (brushSelectionProjectPath) {
		trySetTerrainBrushIdInLocalStorage(brushSelectionProjectPath, terrainSettings.brush.brushId);
	}
}

/** Deep in-place assignment of plain objects: keys missing from the source are deleted, nested plain objects keep their identity. */
function assignTerrainSettingsInPlace(target: Record<string, unknown>, source: Record<string, unknown>): void {
	for (const key of Object.keys(target)) {
		if (!Object.prototype.hasOwnProperty.call(source, key)) {
			delete target[key];
		}
	}

	for (const key of Object.keys(source)) {
		const value = source[key];
		const current = target[key];

		if (isPlainTerrainSettingsObject(value) && isPlainTerrainSettingsObject(current)) {
			assignTerrainSettingsInPlace(current, value);
		} else {
			target[key] = value;
		}
	}
}

function isPlainTerrainSettingsObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

applyTerrainEnginePreferences();

// Per-project brush selection: loaded when a project is opened (and now if one already is).
onProjectConfigurationChangedObservable.add((configuration) => {
	try {
		loadTerrainBrushSelection(configuration.path);
	} catch (e) {
		console.error(e);
	}
});

if (projectConfiguration.path) {
	try {
		loadTerrainBrushSelection(projectConfiguration.path);
	} catch (e) {
		console.error(e);
	}
}

// Changes made less than 300 ms before the window closes are not lost.
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
	window.addEventListener("beforeunload", () => {
		try {
			flushTerrainSettings();
		} catch (e) {
			// Catch silently: the window is closing.
		}
	});
}

/**
 * Returns the terrain tool settings stored in the local storage (parsed JSON, to be merged over the defaults), or null if none are stored or if it fails to access the local storage.
 */
function tryGetTerrainSettingsFromLocalStorage(): unknown | null {
	try {
		const data = localStorage.getItem("babylonjs-editor-terrain-settings");
		return data ? JSON.parse(data) : null;
	} catch (e) {
		return null;
	}
}

/**
 * Sets the terrain tool settings in the local storage.
 * @param value defines the terrain tool settings to store (serialized as JSON).
 */
function trySetTerrainSettingsInLocalStorage(value: unknown): void {
	try {
		localStorage.setItem("babylonjs-editor-terrain-settings", JSON.stringify(value));
	} catch (e) {
		// Catch silently.
	}
}

/**
 * Returns the identifier of the terrain brush selected in the given project, or null if none is stored or if it fails to access the local storage.
 * @param projectPath defines the absolute path of the project file.
 */
function tryGetTerrainBrushIdFromLocalStorage(projectPath: string): string | null {
	try {
		return localStorage.getItem(`babylonjs-editor-terrain-brush-${projectPath}`) || null;
	} catch (e) {
		return null;
	}
}

/**
 * Sets the identifier of the terrain brush selected in the given project in the local storage.
 * @param projectPath defines the absolute path of the project file.
 * @param brushId defines the identifier of the selected brush.
 */
function trySetTerrainBrushIdInLocalStorage(projectPath: string, brushId: string): void {
	try {
		localStorage.setItem(`babylonjs-editor-terrain-brush-${projectPath}`, brushId);
	} catch (e) {
		// Catch silently.
	}
}
