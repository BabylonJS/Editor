import type { Mesh } from "babylonjs";
import { getTerrainMaterialPlugin } from "babylonjs-editor-tools";

import type { Editor } from "../../../editor/main";

import type { ITerrainStrokeRequest, TerrainTool } from "../core/types";

import { getTerrainStaleDecalCount } from "./dependents";
import { getTerrainEditTarget } from "./edit";
import { getTerrainSharedGeometryMeshes, getTerrainSharedMaterialMeshes } from "./eligibility";
import { notifyTerrainChanged } from "./events";
import { getTerrainUndoStore } from "./history";
import { ensureTerrainUniqueMaterial } from "./material";
import { createTerrainRefusedError, TERRAIN_WEIGHTS_TIMEOUT_MS, waitForTerrainWeightsAsync } from "./operations";
import { peekTerrainBinding } from "./registry";
import { getActiveTerrainStroke, getTerrainEditRefusal, onActiveTerrainStrokeChangedObservable, setActiveTerrainStroke, type ITerrainEditRefusalOptions } from "./state";
import {
	createTerrainStrokeConfig,
	getTerrainChangeKinds,
	getTerrainRefusalMessage,
	isTerrainPaintTool,
	runTerrainHeadlessStroke,
	TerrainStrokeHandle,
	type ITerrainStrokeEnd,
} from "./stroke";
import { makeTerrainGeometryUnique } from "./structure";
import { TerrainTransform } from "./transform";
import {
	TerrainRefusedError,
	type ITerrainApplyStrokeOptions,
	type ITerrainBeginStrokeResult,
	type ITerrainPointerSample,
	type ITerrainStrokeResult,
	type TerrainStrokeRefusal,
} from "./types";
import { createTerrainBusyScope, isTerrainEngineBusy, whenTerrainEngineIdleAsync, type ITerrainBusyScope } from "./yield";

/** Processing time of the stroke drawn in the viewport, per frame (§7.4). */
export const TERRAIN_STROKE_FRAME_BUDGET_MS = 6;

/**
 * Pure pre-check of beginTerrainStroke (cursor greying, §1.14): same refusal, no side effect.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 * @param request defines the stroke request.
 */
export function canBeginTerrainStroke(editor: Editor, mesh: Mesh, request: ITerrainStrokeRequest): TerrainStrokeRefusal | null {
	return getTerrainEditRefusal(editor, mesh, getStrokeRefusalOptions(request));
}

/**
 * Starts the stroke drawn in the viewport by the Terrain tab: it becomes the active stroke until it ends; its owner processes it at every
 * frame (processActiveTerrainStroke) and ends it (end: one undo entry, cancel: restored).
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 * @param request defines the stroke request.
 * @param first defines the first pointer sample.
 */
export function beginTerrainStroke(editor: Editor, mesh: Mesh, request: ITerrainStrokeRequest, first: ITerrainPointerSample): ITerrainBeginStrokeResult {
	const refusal = canBeginTerrainStroke(editor, mesh, request);
	if (refusal) {
		if (refusal === "weights-loading") {
			// Starts the lazy load (hidden terrains, first paint after opening the project).
			getTerrainMaterialPlugin(mesh.material as any)
				?.whenWeightMapsReadyAsync()
				.catch(() => {});
		}

		return { handle: null, refusal, message: getTerrainRefusalMessage(refusal) };
	}

	let handle: TerrainStrokeHandle;
	try {
		handle = createStrokeHandle(editor, mesh, request, false);
	} catch (e) {
		if (e instanceof TerrainRefusedError) {
			return { handle: null, refusal: e.refusal, message: e.message };
		}

		throw e;
	}

	setActiveTerrainStroke(handle);

	try {
		handle.addSample(first);
	} catch (e) {
		reportTerrainError(editor, e);
	}

	return { handle, refusal: null, message: null };
}

/**
 * Processes the stroke drawn in the viewport during at most budgetMs, then flushes its changes (budgeted uploads). Called once per frame by
 * the owner of the stroke. A failing stroke is cancelled (restored) instead of failing again at every frame.
 * @param editor defines the reference to the editor.
 * @param budgetMs defines the processing time of the frame.
 */
export function processActiveTerrainStroke(editor: Editor, budgetMs: number = TERRAIN_STROKE_FRAME_BUDGET_MS): void {
	const stroke = getActiveTerrainStroke();
	if (!stroke || !stroke.isActive || stroke.headless) {
		return;
	}

	try {
		stroke.process(budgetMs, performance.now());
		stroke.flush();
	} catch (e) {
		reportTerrainError(editor, e);
		stroke.cancel();
	}
}

/**
 * Headless stroke along world XZ points (cm): vertical projection, synthetic 16 ms timestamps, airbrush off, one undo entry.
 * Waits for the stroke drawn in the viewport to end and for the running operations (external busy scopes excepted, §7.3), makes the shared
 * data unique (options.autoFixSharing), then opens its busy scope ("Painting" / "Sculpting") BEFORE it waits for the weights
 * (options.weightsTimeoutMs), so no UI stroke or operation can start meanwhile; runs in slices (no render loop needed).
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 * @param request defines the stroke request.
 * @param worldPoints defines the world XZ points of the stroke (cm).
 * @param options defines the options of the stroke.
 */
export async function applyTerrainStroke(
	editor: Editor,
	mesh: Mesh,
	request: ITerrainStrokeRequest,
	worldPoints: [number, number][],
	options: ITerrainApplyStrokeOptions = {}
): Promise<ITerrainStrokeResult> {
	const headlessRequest: ITerrainStrokeRequest = { ...request, airbrush: false };
	const refusalOptions: ITerrainEditRefusalOptions = { ...getStrokeRefusalOptions(headlessRequest), engineCall: true };
	const warnings: string[] = [];

	await waitForExclusiveAccessAsync();

	if (options.autoFixSharing) {
		await autoFixSharingAsync(editor, mesh, isTerrainPaintTool(request.tool), warnings);
	}

	const scope = await openExclusiveScopeAsync(refusalOptions.paint ? "Painting" : "Sculpting", mesh);

	try {
		// The material may have changed (made unique by the auto-fix, or by the caller since it prepared the stroke): its weights may still load.
		const plugin = getTerrainMaterialPlugin(mesh.material as any);
		if (plugin && (refusalOptions.paint || refusalOptions.layerFilter)) {
			await waitForTerrainWeightsAsync(plugin, options.weightsTimeoutMs ?? TERRAIN_WEIGHTS_TIMEOUT_MS);
			scope.throwIfAborted();
		}

		const refusal = getTerrainEditRefusal(editor, mesh, { ...refusalOptions, ignoredScope: scope });
		if (refusal) {
			throw createTerrainRefusedError(refusal);
		}

		let end: ITerrainStrokeEnd | null = null;
		const handle = createStrokeHandle(editor, mesh, headlessRequest, true, (value) => (end = value));

		await runTerrainHeadlessStroke(handle, worldPoints, {
			scope,
			onProgress: (progress) => scope.setProgress(progress),
		});

		const result = end as ITerrainStrokeEnd | null;
		if (result?.error) {
			throw result.error;
		}

		const binding = peekTerrainBinding(mesh);
		const transform = TerrainTransform.FromMesh(mesh);
		const range = binding?.geometry.heightRange ?? { min: 0, max: 0 };

		return {
			dabs: handle.dabs,
			changed: getTerrainChangeKinds(result?.changed ?? {}),
			worldHeightRange: [transform.localToWorldHeight(range.min), transform.localToWorldHeight(range.max)],
			staleDecals: getTerrainStaleDecalCount(mesh),
			warnings,
		};
	} finally {
		scope.dispose();
	}
}

function getStrokeRefusalOptions(request: ITerrainStrokeRequest): ITerrainEditRefusalOptions {
	return {
		paint: isTerrainPaintTool(request.tool),
		requiresLayer: request.tool === "paint" || request.tool === "replace",
		layerId: request.layerId,
		layerFilter: !!request.filters?.layer?.enabled,
	};
}

function createStrokeHandle(editor: Editor, mesh: Mesh, request: ITerrainStrokeRequest, headless: boolean, onEnd?: (end: ITerrainStrokeEnd) => void): TerrainStrokeHandle {
	const edit = getTerrainEditTarget(mesh);
	const plugin = getTerrainMaterialPlugin(mesh.material as any);
	const config = createTerrainStrokeConfig(request, plugin, edit.provider, !!edit.target.weights);

	return new TerrainStrokeHandle(edit, config, {
		headless,
		onEnded: (handle, end) => {
			onStrokeEnded(editor, handle, end);
			onEnd?.(end);
		},
	});
}

function onStrokeEnded(editor: Editor, handle: TerrainStrokeHandle, end: ITerrainStrokeEnd): void {
	try {
		if (end.committed) {
			getTerrainUndoStore().register(handle.mesh, end.payload, `${getTerrainToolLabel(handle.tool)} stroke`);
		} else {
			end.payload?.release();
		}

		const kinds = getTerrainChangeKinds(end.changed);
		if (kinds.length) {
			notifyTerrainChanged(handle.mesh, kinds, "stroke");
		}

		if (end.error && !handle.headless) {
			reportTerrainError(editor, end.error);
		}
	} catch (e) {
		reportTerrainError(editor, e);
	}

	if (getActiveTerrainStroke() === handle) {
		setActiveTerrainStroke(null);
	}
}

/**
 * Waits until no stroke is drawn in the viewport and no busy scope of the engine is open (MCP mutations queue behind them, §7.3). External
 * scopes are not waited for: the headless strokes of an MCP mutation run inside its own "Agent editing" scope.
 */
async function waitForExclusiveAccessAsync(): Promise<void> {
	while (getActiveTerrainStroke() || isTerrainEngineBusy()) {
		if (getActiveTerrainStroke()) {
			await whenActiveStrokeEndsAsync();
		} else {
			await whenTerrainEngineIdleAsync();
		}
	}
}

/**
 * Waits for exclusive access (waitForExclusiveAccessAsync) and opens a busy scope in the same synchronous run as the last check, so no
 * UI stroke, operation or other engine call can start in between.
 */
async function openExclusiveScopeAsync(label: string, mesh: Mesh): Promise<ITerrainBusyScope> {
	for (;;) {
		await waitForExclusiveAccessAsync();

		if (!getActiveTerrainStroke() && !isTerrainEngineBusy()) {
			return createTerrainBusyScope(label, mesh);
		}
	}
}

function whenActiveStrokeEndsAsync(): Promise<void> {
	if (!getActiveTerrainStroke()) {
		return Promise.resolve();
	}

	return new Promise<void>((resolve) => {
		const observer = onActiveTerrainStrokeChangedObservable.add((handle) => {
			if (!handle) {
				onActiveTerrainStrokeChangedObservable.remove(observer);
				resolve();
			}
		});
	});
}

/** MCP strokes (autoFixSharing): shared geometry (and material for paint tools) are made unique first, each in its own undo entry. */
async function autoFixSharingAsync(editor: Editor, mesh: Mesh, paint: boolean, warnings: string[]): Promise<void> {
	if (getTerrainSharedGeometryMeshes(mesh).length > 0) {
		makeTerrainGeometryUnique(editor, mesh);
		warnings.push(`The terrain geometry is now unique to “${mesh.name}”.`);
	}

	if (paint && getTerrainMaterialPlugin(mesh.material as any) && getTerrainSharedMaterialMeshes(mesh).length > 0) {
		ensureTerrainUniqueMaterial(editor, mesh);
		warnings.push(`The terrain material is now unique to “${mesh.name}”.`);
	}

	// External scopes excepted: the auto-fix of an MCP stroke runs inside its "Agent editing" scope.
	await whenTerrainEngineIdleAsync();
}

function getTerrainToolLabel(tool: TerrainTool): string {
	const label = tool.replace(/-/g, " ");
	return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Reports an error of the terrain engine in the console of the editor.
 * @param editor defines the reference to the editor.
 * @param error defines the error to report.
 */
export function reportTerrainError(editor: Editor, error: unknown): void {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`[Terrain] ${message}`);

	try {
		editor.layout?.console?.error(`Terrain tool error: ${message}`);
	} catch {
		// The console may not exist (closing window).
	}
}
