import { Observable, type Mesh } from "babylonjs";
import { getTerrainMaterialPlugin, TERRAIN_LAYERS_PER_WEIGHT_MAP, TERRAIN_MAX_LAYERS, type TerrainMaterialPlugin } from "babylonjs-editor-tools";

import type { Editor } from "../../../editor/main";
import { isSavingProject } from "../../../project/save/save";

import { getTerrainEligibility, getTerrainSharedGeometryMeshes, getTerrainSharedMaterialMeshes } from "./eligibility";
import { getTerrainRefusal, type ITerrainRefusalPluginState, type TerrainStrokeHandle } from "./stroke";
import type { TerrainStrokeRefusal } from "./types";
import { hasExternalTerrainBusyScope, isTerrainBusy, isTerrainEngineBusy, type ITerrainBusyScope } from "./yield";

/** Options of getTerrainEditRefusal. */
export interface ITerrainEditRefusalOptions {
	paint: boolean;
	requiresLayer?: boolean;
	layerId?: string | null;
	layerFilter?: boolean;
	ignoreWeightsLoading?: boolean;
	ignoreWeightsState?: boolean;
	/**
	 * Engine call (headless strokes, operations, heights and masks imports): external busy scopes don't make it "busy" and, while one is
	 * open, a running save doesn't refuse it "saving" (the mutation started before the save). Default false: UI strokes count every scope.
	 */
	engineCall?: boolean;
	/** Scope of the call itself, which doesn't make it "busy" (engine calls only). */
	ignoredScope?: ITerrainBusyScope | null;
}

/** Stroke drawn in the viewport by the Terrain tab, null when none. */
let activeStroke: TerrainStrokeHandle | null = null;

/**
 * Notified when the stroke drawn in the viewport starts (the handle) and ends (null).
 */
export const onActiveTerrainStrokeChangedObservable: Observable<TerrainStrokeHandle | null> = new Observable<TerrainStrokeHandle | null>();

/**
 * Returns the stroke drawn in the viewport by the Terrain tab, null when none.
 */
export function getActiveTerrainStroke(): TerrainStrokeHandle | null {
	return activeStroke;
}

/**
 * Sets the stroke drawn in the viewport (null when it ended) and notifies onActiveTerrainStrokeChangedObservable.
 * @param stroke defines the stroke, null when it ended.
 */
export function setActiveTerrainStroke(stroke: TerrainStrokeHandle | null): void {
	if (stroke === activeStroke) {
		return;
	}

	activeStroke = stroke;

	try {
		onActiveTerrainStrokeChangedObservable.notifyObservers(stroke);
	} catch (e) {
		console.error(`[Terrain] ${e instanceof Error ? e.message : String(e)}`);
	}
}

/**
 * Returns whether or not the game plays in the preview (terrains are refused edits meanwhile).
 * @param editor defines the reference to the editor.
 */
export function isTerrainScenePlaying(editor: Editor): boolean {
	const play = editor.layout?.preview?.play;
	return !!(play?.state?.playing || play?.scene);
}

/**
 * Refusal coming from the state of the editor and of the engine only, first match in this order: "playing", "saving" (not while an external
 * busy scope is open: its mutation started before the save), "busy" (a stroke is drawn or a busy scope of the engine is open; external scopes, opened around
 * these calls by an MCP mutation, don't count); null when none. Used by the structure, material, layer and dependents calls.
 * @param editor defines the reference to the editor.
 */
export function getTerrainStateRefusal(editor: Editor): TerrainStrokeRefusal | null {
	if (isTerrainScenePlaying(editor)) {
		return "playing";
	}

	if (isTerrainSaveRefusing(true)) {
		return "saving";
	}

	if (activeStroke !== null || isTerrainEngineBusy()) {
		return "busy";
	}

	return null;
}

/**
 * Refusal of a stroke or a mutation of `mesh` now (§1.17, §7.3). No side effect.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 * @param options defines what the edit requires.
 */
export function getTerrainEditRefusal(editor: Editor, mesh: Mesh, options: ITerrainEditRefusalOptions): TerrainStrokeRefusal | null {
	const plugin = getTerrainMaterialPlugin(mesh.material as any);
	const engineCall = options.engineCall ?? false;

	return getTerrainRefusal({
		eligibility: getTerrainEligibility(mesh),
		playing: isTerrainScenePlaying(editor),
		saving: isTerrainSaveRefusing(engineCall),
		busy: activeStroke !== null || (engineCall ? isTerrainEngineBusy(options.ignoredScope) : isTerrainBusy()),
		hidden: !mesh.isEnabled() || !mesh.isVisible,
		sharedGeometry: getTerrainSharedGeometryMeshes(mesh).length > 0,
		sharedMaterial: !!plugin && options.paint && getTerrainSharedMaterialMeshes(mesh).length > 0,
		paint: options.paint,
		requiresLayer: options.requiresLayer ?? false,
		layerId: options.layerId ?? null,
		layerFilter: options.layerFilter ?? false,
		plugin: plugin ? getRefusalPluginState(plugin) : null,
		ignoreWeightsLoading: options.ignoreWeightsLoading,
		ignoreWeightsState: options.ignoreWeightsState,
	});
}

/**
 * Whether a running save refuses the call. An engine call made while an external busy scope is open (an MCP mutation) is not refused: the
 * mutation started before the save and finishes; what it changes once the save has read the terrain is written by the next save (§7.3).
 * @param engineCall defines whether the call is an engine call (see ITerrainEditRefusalOptions.engineCall).
 */
function isTerrainSaveRefusing(engineCall: boolean): boolean {
	return isSavingProject() && !(engineCall && hasExternalTerrainBusyScope());
}

function getRefusalPluginState(plugin: TerrainMaterialPlugin): ITerrainRefusalPluginState {
	const data = plugin.data;
	const layerCount = Math.min(data.layers.length, TERRAIN_MAX_LAYERS);

	// Mirrors TerrainWeightsBinding.acquire without its side effects: a map with a path but no CPU data is still loading.
	const map0Missing = !plugin.getWeightMap(0) && data.weightMaps[0] !== null;
	const map1Missing = layerCount > TERRAIN_LAYERS_PER_WEIGHT_MAP && !plugin.getWeightMap(1) && data.weightMaps[1] !== null;

	return {
		layerIds: data.layers.map((layer) => layer.id),
		weightMapsState: plugin.weightMapsState,
		hasWeightData: plugin.weightMapsState !== "error" && !map0Missing && !map1Missing,
	};
}
