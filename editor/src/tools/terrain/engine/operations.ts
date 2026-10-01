import { type AbstractMesh, type Mesh } from "babylonjs";
import {
	cloneTerrainMaterialData,
	createDefaultTerrainLayer,
	getTerrainMaterialPlugin,
	TERRAIN_MAX_LAYERS,
	type ITerrainMaterialData,
	type TerrainMaterialPlugin,
} from "babylonjs-editor-tools";

import type { Editor } from "../../../editor/main";

import { computeTerrainHeightRange } from "../core/heightfield";
import { flipTerrainImageRows, terrainHeightsToImage, terrainImageToHeights } from "../core/heightmap";
import { createTerrainFullPayload, createTerrainSnapshotPayload } from "../core/journal";
import { erodeTerrainHydraulic, erodeTerrainThermal } from "../core/kernels/erosion";
import { generateTerrainHeightRows } from "../core/kernels/generate";
import { mulberry32 } from "../core/random";
import { createDefaultTerrainToolSettings } from "../core/settings";
import { fillTerrainLayer, normalizeTerrainWeights, setTerrainWeightsFromSplat } from "../core/weights";
import type { ITerrainImage, ITerrainRect, ITerrainRgbaImage, ITerrainStrokeTarget, ITerrainWeightMaps, TerrainRectsByKind, TerrainResourceKind } from "../core/types";

import { getExistingTerrainEditTarget, getTerrainEditTarget, getTerrainWeightsRefusal } from "./edit";
import { notifyTerrainChanged } from "./events";
import { getTerrainUndoStore } from "./history";
import { enableTerrainTexturePainting } from "./material";
import { getTerrainEditRefusal } from "./state";
import { getTerrainChangeKinds, getTerrainRefusalMessage, markTerrainRectsDirty, type ITerrainEditTarget } from "./stroke";
import {
	TerrainRefusedError,
	type ITerrainHeightImportOptions,
	type ITerrainOperationResult,
	type TerrainChangeKind,
	type TerrainOperation,
	type TerrainStrokeRefusal,
} from "./types";
import { installTerrainWeightMaps } from "./weights-binding";
import { createTerrainBusyScope, TerrainWorkSlicer, yieldTerrainWork } from "./yield";

/** Droplets per batch of the global hydraulic erosion (§7.4). */
export const TERRAIN_HYDRAULIC_BATCH_DROPLETS = 5000;

/** Rows of heights generated between two checkpoints of a generation. */
export const TERRAIN_GENERATE_BAND_ROWS = 16;

/** Default time the weight-based mutations wait for loading weight maps (§3.5 applyStroke). */
export const TERRAIN_WEIGHTS_TIMEOUT_MS = 30000;

/** Warning of the operation results when the weights could not be used. */
const WEIGHTS_UNAVAILABLE_MESSAGE = "The terrain weights are not loaded.";

/** Busy label of each operation (§1.5 busy banner "{label}… {percent} %"). */
export const TERRAIN_OPERATION_LABELS: Readonly<Record<TerrainOperation["type"], string>> = {
	generate: "Generating",
	smooth: "Smoothing",
	"erode-thermal": "Eroding",
	"erode-hydraulic": "Eroding",
	terrace: "Terracing",
	flatten: "Flattening",
	offset: "Offsetting heights",
	scale: "Scaling heights",
	normalize: "Normalizing heights",
	"clear-holes": "Clearing holes",
	"fill-layer": "Filling layer",
	"normalize-weights": "Normalizing weights",
};

/** Label of the undo entry of each operation. */
export const TERRAIN_OPERATION_UNDO_LABELS: Readonly<Record<TerrainOperation["type"], string>> = {
	generate: "Generate terrain",
	smooth: "Smooth terrain",
	"erode-thermal": "Erode terrain (thermal)",
	"erode-hydraulic": "Erode terrain (hydraulic)",
	terrace: "Terrace terrain",
	flatten: "Flatten terrain",
	offset: "Offset terrain heights",
	scale: "Scale terrain heights",
	normalize: "Normalize terrain heights",
	"clear-holes": "Clear terrain holes",
	"fill-layer": "Fill terrain layer",
	"normalize-weights": "Normalize terrain weights",
};

/**
 * Returns whether or not the operation writes the weight maps (fill-layer, normalize-weights).
 * @param operation defines the operation.
 */
export function isTerrainWeightOperation(operation: TerrainOperation): boolean {
	return operation.type === "fill-layer" || operation.type === "normalize-weights";
}

/**
 * Resource kinds written by an operation (heights, holes or the existing weight maps).
 * @param operation defines the operation.
 * @param edit defines the terrain (its weights tell which maps exist).
 */
export function getTerrainOperationResourceKinds(operation: TerrainOperation, edit: ITerrainEditTarget): TerrainResourceKind[] {
	if (operation.type === "clear-holes") {
		return ["holes"];
	}

	if (isTerrainWeightOperation(operation)) {
		return edit.target.weights?.maps[1] ? ["weights0", "weights1"] : ["weights0"];
	}

	return ["heights"];
}

/** Context of the executor of one operation. */
export interface ITerrainOperationContext {
	edit: ITerrainEditTarget;
	plugin: TerrainMaterialPlugin | null;
	/** Waits between slices: yields when the slice budget is spent, then throws when the scope was aborted or the run was cancelled. */
	checkpoint(): Promise<void>;
	/** Progress of the operation, 0..1. */
	progress(value: number): void;
}

/**
 * Runs one whole-terrain operation on the live data and returns the changed rects (§3.5 TerrainOperation, §4.4, §4.5, §4.10, §4.11).
 * Heights operations run in slices (checkpoint between them); nothing is uploaded nor registered here.
 * @param operation defines the operation.
 * @param context defines the terrain, its plugin, the slice checkpoint and the progress callback.
 */
export async function executeTerrainOperation(operation: TerrainOperation, context: ITerrainOperationContext): Promise<TerrainRectsByKind> {
	const target = context.edit.target;
	const { grid, metric, heights } = target;
	const verticesRect = fullRect(grid.columns, grid.rows);

	switch (operation.type) {
		case "generate": {
			const params = operation.params;
			const rows = { grid, metric, params, worldToLocalHeight: (worldY: number) => target.worldToLocalHeight(worldY), current: heights, out: heights, mode: operation.mode };

			// Rows are independent (§4.11): the generation runs in bands of rows, in place, between checkpoints.
			for (let row = 0; row < grid.rows; ) {
				const end = Math.min(grid.rows, row + TERRAIN_GENERATE_BAND_ROWS);
				generateTerrainHeightRows(rows, row, end);
				row = end;

				context.progress(0.3 * (row / grid.rows));
				await context.checkpoint();
			}

			const droplets = Math.max(0, Math.floor(params.erosionDroplets ?? 0));
			if (droplets > 0) {
				await erodeHydraulicInBatches(target, droplets, params.seed, context, 0.3, 0.9);
			}

			const steps = Math.max(0, Math.floor(params.terraceSteps ?? 0));
			if (steps > 0 && params.maxWorld !== params.minWorld) {
				terraceTerrainHeights(target, (params.maxWorld - params.minWorld) / steps, 0.8, params.minWorld);
			}

			context.progress(1);
			return { heights: verticesRect };
		}

		case "smooth": {
			const iterations = Math.max(1, Math.min(100, Math.floor(operation.iterations)));
			const factor = clamp01(operation.strength);
			const blurred = new Float32Array(heights.length);
			const scratch = new Float32Array(heights.length);

			for (let i = 0; i < iterations; ++i) {
				blurTerrainHeights(heights, grid.columns, grid.rows, 1, blurred, scratch);
				for (let v = 0; v < heights.length; ++v) {
					heights[v] += (blurred[v] - heights[v]) * factor;
				}

				context.progress((i + 1) / iterations);
				await context.checkpoint();
			}

			return { heights: verticesRect };
		}

		case "erode-thermal": {
			const iterations = Math.max(1, Math.floor(operation.iterations));
			for (let i = 0; i < iterations; ++i) {
				erodeTerrainThermal(heights, grid, metric, { talusDegrees: operation.talusDegrees, iterations: 1, amount: operation.amount });
				context.progress((i + 1) / iterations);
				await context.checkpoint();
			}

			return { heights: verticesRect };
		}

		case "erode-hydraulic": {
			await erodeHydraulicInBatches(target, Math.max(0, Math.floor(operation.droplets)), operation.seed, context, 0, 1);
			return { heights: verticesRect };
		}

		case "terrace": {
			terraceTerrainHeights(target, operation.step, operation.sharpness, operation.offset);
			context.progress(1);
			return { heights: verticesRect };
		}

		case "flatten": {
			heights.fill(target.worldToLocalHeight(operation.heightWorld));
			context.progress(1);
			return { heights: verticesRect };
		}

		case "offset": {
			const delta = operation.amountWorld / metric.sy;
			for (let v = 0; v < heights.length; ++v) {
				heights[v] += delta;
			}

			context.progress(1);
			return { heights: verticesRect };
		}

		case "scale": {
			for (let v = 0; v < heights.length; ++v) {
				const world = target.localToWorldHeight(heights[v]);
				heights[v] = target.worldToLocalHeight(operation.pivotWorld + (world - operation.pivotWorld) * operation.factor);
			}

			context.progress(1);
			return { heights: verticesRect };
		}

		case "normalize": {
			const range = computeTerrainHeightRange(heights, grid);
			const minWorld = target.localToWorldHeight(range.min);
			const maxWorld = target.localToWorldHeight(range.max);
			const span = maxWorld - minWorld;

			for (let v = 0; v < heights.length; ++v) {
				const t = span > 1e-6 ? (target.localToWorldHeight(heights[v]) - minWorld) / span : 0;
				heights[v] = target.worldToLocalHeight(operation.minWorld + t * (operation.maxWorld - operation.minWorld));
			}

			context.progress(1);
			return { heights: verticesRect };
		}

		case "clear-holes": {
			target.holes.fill(0);
			context.progress(1);
			return { holes: fullRect(grid.subdivisions, grid.subdivisions) };
		}

		case "fill-layer":
		case "normalize-weights": {
			const weights = target.weights;
			if (!weights) {
				throw new Error(WEIGHTS_UNAVAILABLE_MESSAGE);
			}

			const changed = await executeTerrainWeightOperation(operation, weights, context);
			context.progress(1);
			return changed;
		}
	}
}

async function executeTerrainWeightOperation(operation: TerrainOperation, weights: ITerrainWeightMaps, context: ITerrainOperationContext): Promise<TerrainRectsByKind> {
	const layers = context.plugin?.data.layers ?? [];
	const all = fullWeightRects(weights);

	switch (operation.type) {
		case "fill-layer": {
			fillTerrainLayer(weights, getLayerIndexOrThrow(layers, operation.layerId));
			return all;
		}

		case "normalize-weights": {
			normalizeTerrainWeights(weights);
			return all;
		}

		default:
			return {};
	}
}

/**
 * Separable edge-clamped box blur of radius `radius` applied twice (≈ gaussian), the filter of the smooth tool (§4.4), over the whole grid.
 * @param source defines the heights to blur (read only).
 * @param columns defines the number of columns (S + 1).
 * @param rows defines the number of rows (S + 1).
 * @param radius defines the box radius in cells.
 * @param out defines the destination (same length as source).
 * @param scratch defines a scratch buffer (same length as source).
 */
export function blurTerrainHeights(source: Float32Array, columns: number, rows: number, radius: number, out: Float32Array, scratch: Float32Array): void {
	const k = Math.max(0, Math.floor(radius));

	boxBlurRows(source, scratch, columns, rows, k);
	boxBlurColumns(scratch, out, columns, rows, k);
	boxBlurRows(out, scratch, columns, rows, k);
	boxBlurColumns(scratch, out, columns, rows, k);
}

/** Edge-clamped box blur of every row: running sum of the clamped taps [c − k, c + k] (O(1) per element). */
function boxBlurRows(source: Float32Array, out: Float32Array, columns: number, rows: number, k: number): void {
	const scale = 1 / (2 * k + 1);
	const last = columns - 1;

	for (let r = 0; r < rows; ++r) {
		const offset = r * columns;

		let sum = 0;
		for (let d = -k; d <= k; ++d) {
			sum += source[offset + (d < 0 ? 0 : d > last ? last : d)];
		}

		out[offset] = sum * scale;

		for (let c = 1; c < columns; ++c) {
			const added = c + k;
			const removed = c - k - 1;
			sum += source[offset + (added > last ? last : added)] - source[offset + (removed < 0 ? 0 : removed)];
			out[offset + c] = sum * scale;
		}
	}
}

/** Edge-clamped box blur of every column (same running sum along the rows). */
function boxBlurColumns(source: Float32Array, out: Float32Array, columns: number, rows: number, k: number): void {
	const scale = 1 / (2 * k + 1);
	const last = rows - 1;

	for (let c = 0; c < columns; ++c) {
		let sum = 0;
		for (let d = -k; d <= k; ++d) {
			sum += source[(d < 0 ? 0 : d > last ? last : d) * columns + c];
		}

		out[c] = sum * scale;

		for (let r = 1; r < rows; ++r) {
			const added = r + k;
			const removed = r - k - 1;
			sum += source[(added > last ? last : added) * columns + c] - source[(removed < 0 ? 0 : removed) * columns + c];
			out[r * columns + c] = sum * scale;
		}
	}
}

/**
 * Global terrace at full strength (§4.4 terrace with a = 1): Y = localToWorld(h), t = (Y − offset)/step, k = mix(1, 12, sharpness),
 * Yt = offset + step (floor(t) + fract(t)^k), h = worldToLocal(Yt). A non-positive step does nothing.
 * @param target defines the terrain.
 * @param step defines the step height (world cm).
 * @param sharpness defines the sharpness 0..1.
 * @param offset defines the offset (world cm).
 */
export function terraceTerrainHeights(target: ITerrainStrokeTarget, step: number, sharpness: number, offset: number): void {
	if (!(step > 0)) {
		return;
	}

	const heights = target.heights;
	const exponent = 1 + (12 - 1) * clamp01(sharpness);

	for (let v = 0; v < heights.length; ++v) {
		const t = (target.localToWorldHeight(heights[v]) - offset) / step;
		const floor = Math.floor(t);
		heights[v] = target.worldToLocalHeight(offset + step * (floor + Math.pow(t - floor, exponent)));
	}
}

async function erodeHydraulicInBatches(target: ITerrainStrokeTarget, droplets: number, seed: number, context: ITerrainOperationContext, from: number, to: number): Promise<void> {
	if (droplets <= 0) {
		return;
	}

	const options = { ...createDefaultTerrainToolSettings().sculpt.erode, type: "hydraulic" as const, seed };
	const random = mulberry32(seed);

	for (let done = 0; done < droplets; ) {
		const batch = Math.min(TERRAIN_HYDRAULIC_BATCH_DROPLETS, droplets - done);
		erodeTerrainHydraulic(target.heights, target.grid, target.metric, { ...options, droplets: batch }, random);
		done += batch;

		context.progress(from + (to - from) * (done / droplets));
		await context.checkpoint();
	}
}

/**
 * Applies one operation with its own undo entry (§3.5 applyOperation): busy scope while running, full payload of the written
 * resources captured first, slices of ≤ 16 ms, synchronous flush + finalize, then one entry
 * and one notification (reason "operation"). When the scene is disposed the start state is restored, nothing is registered and a
 * TerrainOperationAbortedError is thrown. Throws TerrainRefusedError when refused (checked synchronously, before anything runs).
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 * @param operation defines the operation.
 * @param options defines the progress callback.
 */
export async function applyTerrainOperation(
	editor: Editor,
	mesh: Mesh,
	operation: TerrainOperation,
	options: { onProgress?: (progress: number) => void } = {}
): Promise<ITerrainOperationResult> {
	const refusal = getTerrainEditRefusal(editor, mesh, { paint: isTerrainWeightOperation(operation), ignoreWeightsState: true, engineCall: true });
	if (refusal) {
		throw createTerrainRefusedError(refusal);
	}

	const label = TERRAIN_OPERATION_LABELS[operation.type];
	const scope = createTerrainBusyScope(label, mesh);

	try {
		const warnings: string[] = [];
		const weightOperation = isTerrainWeightOperation(operation);
		const plugin = getTerrainMaterialPlugin(mesh.material as any);

		if (weightOperation) {
			if (!plugin) {
				throw createTerrainRefusedError("no-material");
			}

			await waitForTerrainWeightsAsync(plugin, TERRAIN_WEIGHTS_TIMEOUT_MS);
			scope.throwIfAborted();

			const refusal = getTerrainWeightsRefusal(mesh);
			if (refusal === "weights-error" && operation.type === "fill-layer") {
				const reset = resetTerrainWeightMaps(mesh, plugin, operation.layerId);
				return finishResult(reset.edit, reset.changed, warnings);
			}

			if (refusal) {
				throw createTerrainRefusedError(refusal);
			}
		}

		const edit = getTerrainEditTarget(mesh);
		const kinds = getTerrainOperationResourceKinds(operation, edit);

		const payload = createTerrainFullPayload(edit.provider, kinds, edit.signature);

		const slicer = new TerrainWorkSlicer();
		const context: ITerrainOperationContext = {
			edit,
			plugin,
			progress: (value) => {
				scope.setProgress(value);
				options.onProgress?.(value);
			},
			checkpoint: async () => {
				await slicer.maybeYield();
				scope.throwIfAborted();
			},
		};

		let changed: TerrainRectsByKind;
		try {
			changed = await executeTerrainOperation(operation, context);
			scope.throwIfAborted();
		} catch (e) {
			// Restore the start state: the payload holds it.
			const restored = payload.swap(edit.provider, edit.signature);
			payload.release();

			applyChangedRects(edit, restored, !scope.aborted);
			throw e;
		}

		applyChangedRects(edit, changed, true);
		getTerrainUndoStore().register(mesh, payload, TERRAIN_OPERATION_UNDO_LABELS[operation.type]);

		const changeKinds = getTerrainChangeKinds(changed);
		if (changeKinds.length) {
			notifyTerrainChanged(mesh, changeKinds, "operation");
		}

		return finishResult(edit, changed, warnings);
	} finally {
		scope.dispose();
	}
}

/**
 * fill-layer on a terrain whose weight maps failed to load (§6.2 "Reset after a load error"): fresh maps of weightMapSize filled with the
 * layer (map 1 too with more than 4 layers), paths cleared (the next save writes new canonical files). One snapshot entry: undo restores
 * the old paths and the data of the maps that loaded, and reloads the maps that failed (the error state and its banner come back); redo
 * installs the fresh maps again. The edit target is checked first: a refusal (e.g. a clone sharing the geometry made while the weights
 * were awaited) leaves the weights untouched.
 */
function resetTerrainWeightMaps(mesh: Mesh, plugin: TerrainMaterialPlugin, layerId: string): { edit: ITerrainEditTarget; changed: TerrainRectsByKind } {
	const layerIndex = getLayerIndexOrThrow(plugin.data.layers, layerId);
	const size = plugin.data.weightMapSize;
	const mapCount = plugin.data.layers.length > 4 ? 2 : 1;

	// Throws before anything is installed; the target is taken again below, once the fresh maps can be bound.
	getTerrainEditTarget(mesh);

	interface IWeightState {
		paths: [string | null, string | null];
		maps: [Uint8Array | null, Uint8Array | null];
	}

	const fresh: [Uint8Array | null, Uint8Array | null] = [null, null];
	for (let k = 0; k < mapCount; ++k) {
		const data = new Uint8Array(size * size * 4);
		if (layerIndex >> 2 === k) {
			const channel = layerIndex & 3;
			for (let i = channel; i < data.length; i += 4) {
				data[i] = 255;
			}
		}

		fresh[k] = data;
	}

	const install = (state: IWeightState): IWeightState => {
		const previous: IWeightState = {
			paths: [plugin.data.weightMaps[0], plugin.data.weightMaps[1]],
			maps: [copyWeightData(plugin, 0), copyWeightData(plugin, 1)],
		};

		// The state's arrays are handed over (the payload only keeps `previous`); a map with a path but no data is reloaded from it.
		installTerrainWeightMaps(plugin, state.paths, state.maps);

		return previous;
	};

	const previous = install({ paths: [null, null], maps: fresh });
	const changed = fullWeightRectsFromSizes(size, mapCount);

	const payload = createTerrainSnapshotPayload<IWeightState>({
		state: previous,
		byteLength: (previous.maps[0]?.byteLength ?? 0) + (previous.maps[1]?.byteLength ?? 0),
		signature: "",
		exchange: (state) => ({ previous: install(state), changed: fullWeightRectsFromSizes(size, mapCount) }),
	});

	// Same synchronous turn as the check above: the binding exists, and binds the fresh maps now.
	const edit = getExistingTerrainEditTarget(mesh) ?? getTerrainEditTarget(mesh);
	applyChangedRects(edit, changed, true);

	getTerrainUndoStore().register(mesh, payload, TERRAIN_OPERATION_UNDO_LABELS["fill-layer"], { snapshot: true, kinds: ["weights"] });
	notifyTerrainChanged(mesh, ["weights"], "operation");

	return { edit, changed };
}

function copyWeightData(plugin: TerrainMaterialPlugin, index: 0 | 1): Uint8Array | null {
	const map = plugin.getWeightMap(index);
	return map ? new Uint8Array(map.data) : null;
}

/**
 * Heightmap import (§3.5 replaceHeights, §4.12): image in image order, values 0..1, black → minWorld, white → maxWorld; one undo entry.
 * Modes: replace h = worldToLocal(Y), add h += Y/sy, max/min against worldToLocal(Y). flipY flips the rows first.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 * @param image defines the heightmap.
 * @param options defines the range, the mode and the flip.
 */
export async function replaceTerrainHeights(editor: Editor, mesh: Mesh, image: ITerrainImage, options: ITerrainHeightImportOptions): Promise<void> {
	const refusal = getTerrainEditRefusal(editor, mesh, { paint: false, engineCall: true });
	if (refusal) {
		throw createTerrainRefusedError(refusal);
	}

	const scope = createTerrainBusyScope("Importing heightmap", mesh);

	try {
		const edit = getTerrainEditTarget(mesh);
		const target = edit.target;
		const payload = createTerrainFullPayload(edit.provider, ["heights"], edit.signature);

		const source = options.flipY ? flipTerrainImageRows(image) : image;
		const add = options.mode === "add";
		const minLocal = add ? options.minWorld / target.metric.sy : target.worldToLocalHeight(options.minWorld);
		const maxLocal = add ? options.maxWorld / target.metric.sy : target.worldToLocalHeight(options.maxWorld);

		let heights: Float32Array;
		try {
			heights = terrainImageToHeights(source, target.grid, minLocal, maxLocal, options.mode, target.heights);
		} catch (e) {
			payload.release();
			throw e;
		}

		target.heights.set(heights);
		scope.setProgress(1);

		const changed: TerrainRectsByKind = { heights: fullRect(target.grid.columns, target.grid.rows) };
		applyChangedRects(edit, changed, true);

		getTerrainUndoStore().register(mesh, payload, "Import heightmap");
		notifyTerrainChanged(mesh, ["heights"], "operation");
	} finally {
		scope.dispose();
	}
}

/**
 * (S+1) x (S+1) image of the heights normalized to the world range of the terrain (§3.5 getHeightImage, §4.12); a flat terrain gets
 * maxWorld = minWorld + 1.
 * @param target defines the heights (a read-only view is enough).
 */
export function getTerrainHeightImage(target: Pick<ITerrainStrokeTarget, "grid" | "heights" | "localToWorldHeight" | "worldToLocalHeight">): {
	image: ITerrainImage;
	minWorld: number;
	maxWorld: number;
} {
	const range = computeTerrainHeightRange(target.heights, target.grid);
	const minWorld = target.localToWorldHeight(range.min);
	let maxWorld = target.localToWorldHeight(range.max);
	if (!(maxWorld - minWorld > 1e-6)) {
		maxWorld = minWorld + 1;
	}

	const image = terrainHeightsToImage(target.heights, target.grid, target.worldToLocalHeight(minWorld), target.worldToLocalHeight(maxWorld));
	return { image, minWorld, maxWorld };
}

/**
 * Splat map import (§4.10.10): enables texture painting first when needed (its own entry), adds default layers "Splat {n}" up to
 * 4 x (splats used), replaces every weight; one snapshot entry `{ data, maps }` for the layers and the weights.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 * @param splats defines one or two RGBA splat maps (image order).
 */
export async function importTerrainSplatMapsAsync(editor: Editor, mesh: Mesh, splats: [ITerrainRgbaImage, ITerrainRgbaImage | null]): Promise<void> {
	// With a terrain material the weights of every mesh sharing it would change: the paint refusals apply (shared-material...).
	const refusal = getTerrainEditRefusal(editor, mesh, { paint: !!getTerrainMaterialPlugin(mesh.material as any), ignoreWeightsState: true, engineCall: true });
	if (refusal) {
		throw createTerrainRefusedError(refusal);
	}

	const plugin = getTerrainMaterialPlugin(mesh.material as any) ?? (await enableTerrainTexturePainting(editor, mesh));
	const scope = createTerrainBusyScope("Importing splat map", mesh);

	try {
		await waitForTerrainWeightsAsync(plugin, TERRAIN_WEIGHTS_TIMEOUT_MS);
		scope.throwIfAborted();

		const refusal = getTerrainWeightsRefusal(mesh);
		if (refusal) {
			throw createTerrainRefusedError(refusal);
		}

		// Throws before anything is installed (e.g. a clone sharing the geometry made during the waits); taken again once the maps changed.
		getTerrainEditTarget(mesh);

		interface ISplatState {
			data: ITerrainMaterialData;
			maps: [Uint8Array | null, Uint8Array | null];
		}

		const capture = (): ISplatState => ({
			data: cloneTerrainMaterialData(plugin.data as ITerrainMaterialData),
			maps: [copyWeightData(plugin, 0), copyWeightData(plugin, 1)],
		});

		const size = plugin.getWeightMap(0)!.size;
		const install = (state: ISplatState): TerrainRectsByKind => {
			plugin.setData(cloneTerrainMaterialData(state.data));

			([0, 1] as const).forEach((k) => {
				const data = state.maps[k];
				const live = plugin.getWeightMap(k);
				if (data && live && live.data.length === data.length) {
					live.data.set(data);
				} else {
					plugin.setWeightMap(k, data ? { size: Math.round(Math.sqrt(data.length / 4)), data: new Uint8Array(data) } : null);
				}
			});

			return fullWeightRectsFromSizes(size, state.maps[1] ? 2 : 1);
		};

		const before = capture();

		const splatCount = splats[1] ? 2 : 1;
		const layerCount = Math.min(TERRAIN_MAX_LAYERS, Math.max(before.data.layers.length, 4 * splatCount));

		const data = cloneTerrainMaterialData(before.data);
		for (let i = data.layers.length; i < layerCount; ++i) {
			data.layers.push(createDefaultTerrainLayer({ name: `Splat ${i + 1}` }));
		}

		const map0 = new Uint8Array(before.maps[0]!);
		const map1 = layerCount > 4 ? (before.maps[1] ? new Uint8Array(before.maps[1]) : new Uint8Array(size * size * 4)) : null;

		setTerrainWeightsFromSplat({ size, layerCount, maps: [map0, map1] }, splats);
		scope.setProgress(0.9);

		const changed = install({ data, maps: [map0, map1] });

		const payload = createTerrainSnapshotPayload<ISplatState>({
			state: before,
			byteLength: (before.maps[0]?.byteLength ?? 0) + (before.maps[1]?.byteLength ?? 0),
			signature: "",
			exchange: (state) => {
				const previous = capture();
				return { previous, changed: install(state) };
			},
		});

		// Same synchronous turn as the check above: the binding exists, and binds the new maps now.
		applyChangedRects(getExistingTerrainEditTarget(mesh) ?? getTerrainEditTarget(mesh), changed, true);

		const kinds: TerrainChangeKind[] = data.layers.length !== before.data.layers.length ? ["layers", "weights"] : ["weights"];
		getTerrainUndoStore().register(mesh, payload, "Import splat map", { snapshot: true, kinds });
		notifyTerrainChanged(mesh, kinds, "operation");
	} finally {
		scope.dispose();
	}
}

/**
 * Resolves true when the weight maps and layer arrays are loaded and the material is ready for every sub-mesh with its current defines
 * (drives the compilation itself with isReadyForSubMesh, no render loop needed); false on timeout (§3.5 whenTerrainReadyAsync, §8.1 rule 4).
 * @param mesh defines the terrain.
 * @param timeoutMs defines the timeout (default 10000 ms).
 */
export async function waitForTerrainReadyAsync(mesh: Mesh, timeoutMs: number = 10000): Promise<boolean> {
	const deadline = getNow() + Math.max(0, timeoutMs);

	const plugin = getTerrainMaterialPlugin(mesh.material as any);
	if (plugin) {
		const loaded = await raceTimeout(Promise.all([plugin.whenWeightMapsReadyAsync(), plugin.whenLayerTexturesReadyAsync()]), deadline - getNow());
		if (!loaded) {
			return false;
		}
	}

	for (;;) {
		if (mesh.isDisposed() || isTerrainMaterialReady(mesh)) {
			return true;
		}

		if (getNow() >= deadline) {
			return false;
		}

		await delay(Math.min(50, Math.max(0, deadline - getNow())));
	}
}

/**
 * Returns whether or not the material of the mesh is ready for every sub-mesh WITH ITS CURRENT DEFINES (compiles the effects when needed):
 * false while a previous effect is still drawing because the effect of the current defines compiles (shader hot swapping).
 * @param mesh defines the mesh.
 */
export function isTerrainMaterialReady(mesh: AbstractMesh): boolean {
	const material = mesh.material;
	if (!material) {
		return true;
	}

	const useInstances = (mesh as any).hasInstances === true;
	const subMeshes = mesh.subMeshes ?? [];

	if (!subMeshes.length || !(material as any)._storeEffectOnSubMeshes) {
		return material.isReady(mesh, useInstances);
	}

	for (const subMesh of subMeshes) {
		const effective = subMesh.getMaterial() ?? material;

		if (!(effective as any)._storeEffectOnSubMeshes) {
			if (!effective.isReady(mesh, useInstances)) {
				return false;
			}
			continue;
		}

		// isReadyForSubMesh answers from a per-render cache ("already checked in this render"): a define change made since the last render
		// (a layer added, an overlay switched...) would not be seen before the next frame. Invalidate it so the new defines are processed and
		// compiled now, without the render loop (MCP calls while the window is minimized, §7.4).
		const defines = subMesh.materialDefines as { isDirty: boolean; _renderId: number } | null;
		if (defines?.isDirty) {
			defines._renderId = -1;
		}

		if (!effective.isReadyForSubMesh(mesh, subMesh, useInstances)) {
			return false;
		}

		// Shader hot swapping (§0.1): while the effect of the new defines compiles, isReadyForSubMesh returns true with the PREVIOUS effect and
		// marks the defines unprocessed again. The terrain doesn't render its final state yet (a frozen material never switches: ready).
		if (!effective.isFrozen && (subMesh.materialDefines as { isDirty: boolean } | null)?.isDirty) {
			return false;
		}
	}

	return true;
}

/**
 * Waits until the weight maps of the plugin are loaded (or failed), at most `timeoutMs` (§3.5 weightsTimeoutMs). Starts the lazy load
 * (hidden terrains included). Resolves true when they are no longer loading.
 * @param plugin defines the terrain material plugin.
 * @param timeoutMs defines the timeout.
 */
export async function waitForTerrainWeightsAsync(plugin: TerrainMaterialPlugin, timeoutMs: number): Promise<boolean> {
	if (plugin.weightMapsState !== "idle" && plugin.weightMapsState !== "loading") {
		return true;
	}

	return raceTimeout(plugin.whenWeightMapsReadyAsync(), timeoutMs);
}

/**
 * TerrainRefusedError with the §1.17 text of the refusal.
 * @param refusal defines the refusal.
 */
export function createTerrainRefusedError(refusal: TerrainStrokeRefusal): TerrainRefusedError {
	return new TerrainRefusedError(refusal, getTerrainRefusalMessage(refusal));
}

function finishResult(edit: ITerrainEditTarget, changed: TerrainRectsByKind, warnings: string[]): ITerrainOperationResult {
	const target = edit.target;
	const range = computeTerrainHeightRange(target.heights, target.grid);

	return {
		changed: getTerrainChangeKinds(changed),
		worldHeightRange: [target.localToWorldHeight(range.min), target.localToWorldHeight(range.max)],
		warnings,
	};
}

/** markDirty + synchronous final flush + finalize (errors reported, never thrown: the data is already consistent). */
function applyChangedRects(edit: ITerrainEditTarget, changed: TerrainRectsByKind, finalize: boolean): void {
	try {
		markTerrainRectsDirty(edit.target, changed);
		edit.flush(true);
		if (finalize) {
			edit.finalize(changed);
		}
	} catch (e) {
		reportOperationError(e);
	}
}

function getLayerIndexOrThrow(layers: readonly { id: string }[], layerId: string): number {
	const index = layers.findIndex((layer) => layer.id === layerId);
	if (index === -1) {
		throw createTerrainRefusedError("no-layer");
	}

	return index;
}

function fullRect(width: number, height: number): ITerrainRect {
	return { x0: 0, y0: 0, x1: width - 1, y1: height - 1 };
}

function fullWeightRects(weights: ITerrainWeightMaps): TerrainRectsByKind {
	return fullWeightRectsFromSizes(weights.size, weights.maps[1] ? 2 : 1);
}

function fullWeightRectsFromSizes(size: number, mapCount: number): TerrainRectsByKind {
	const rect = fullRect(size, size);
	return mapCount > 1 ? { weights0: rect, weights1: { ...rect } } : { weights0: rect };
}

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

async function raceTimeout(promise: Promise<unknown>, timeoutMs: number): Promise<boolean> {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	try {
		return await Promise.race([
			promise.then(
				() => true,
				() => true
			),
			new Promise<boolean>((resolve) => {
				timeoutId = setTimeout(() => resolve(false), Math.max(0, timeoutMs));
			}),
		]);
	} finally {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
		}
	}
}

function delay(timeMs: number): Promise<void> {
	if (timeMs <= 0) {
		return yieldTerrainWork();
	}

	return new Promise<void>((resolve) => setTimeout(resolve, timeMs));
}

function getNow(): number {
	return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function reportOperationError(error: unknown): void {
	console.error(`[Terrain] ${error instanceof Error ? error.message : String(error)}`);
}
