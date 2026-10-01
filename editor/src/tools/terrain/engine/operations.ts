import { Observable, type AbstractMesh, type Mesh, type Node, type Nullable, type Observer } from "babylonjs";
import {
	cloneTerrainMaterialData,
	createDefaultTerrainLayer,
	getTerrainMaterialPlugin,
	TERRAIN_MAX_LAYERS,
	type ITerrainMaterialData,
	type TerrainMaterialPlugin,
} from "babylonjs-editor-tools";

import { toast } from "sonner";

import type { Editor } from "../../../editor/main";

import { computeTerrainHeightRange, sampleTerrainGradient, sampleTerrainHeight } from "../core/heightfield";
import { flipTerrainImageRows, terrainHeightsToImage, terrainImageToHeights } from "../core/heightmap";
import { createTerrainFullPayload, createTerrainSnapshotPayload, TerrainTileJournal } from "../core/journal";
import { applyTerrainAutoPaint, type ITerrainTexelSurface } from "../core/kernels/auto-paint";
import { erodeTerrainHydraulic, erodeTerrainThermal } from "../core/kernels/erosion";
import { generateTerrainHeightRows } from "../core/kernels/generate";
import { mulberry32 } from "../core/random";
import { isTerrainRectEmpty, unionTerrainRects } from "../core/rect";
import { createDefaultTerrainToolSettings } from "../core/settings";
import { fillTerrainLayer, getTerrainLayerMask, normalizeTerrainWeights, setTerrainLayerMask, setTerrainWeightsFromSplat } from "../core/weights";
import type {
	ITerrainDabWeights,
	ITerrainImage,
	ITerrainRect,
	ITerrainRgbaImage,
	ITerrainStrokeTarget,
	ITerrainUndoPayload,
	ITerrainWeightMaps,
	TerrainRectsByKind,
	TerrainResourceKind,
} from "../core/types";

import { getExistingTerrainEditTarget, getTerrainEditTarget, getTerrainWeightsRefusal } from "./edit";
import { notifyTerrainChanged } from "./events";
import { getTerrainUndoStore } from "./history";
import { enableTerrainTexturePainting } from "./material";
import { getActiveTerrainPreview, getTerrainEditRefusal, setActiveTerrainPreview } from "./state";
import {
	getTerrainChangeKinds,
	getTerrainRefusalMessage,
	markTerrainRectsDirty,
	projectTerrainWorldPoint,
	readTerrainAutoPaintRules,
	resolveTerrainAutoPaintRules,
	type ITerrainEditTarget,
} from "./stroke";
import {
	TerrainRefusedError,
	type ITerrainHeightImportOptions,
	type ITerrainOperationResult,
	type ITerrainPreviewTransaction,
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

/** Texel rows auto-painted between two checkpoints of a whole-map auto-paint. */
export const TERRAIN_AUTO_PAINT_BAND_ROWS = 32;

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
	"auto-paint": "Auto-painting",
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
	"auto-paint": "Auto-paint terrain",
	"normalize-weights": "Normalize terrain weights",
};

/**
 * Returns whether or not the operation writes the weight maps (fill-layer, auto-paint, normalize-weights).
 * @param operation defines the operation.
 */
export function isTerrainWeightOperation(operation: TerrainOperation): boolean {
	return operation.type === "fill-layer" || operation.type === "auto-paint" || operation.type === "normalize-weights";
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

/** Thrown inside a preview apply superseded by a newer apply, a cancel or a close. */
class TerrainPreviewSupersededError extends Error {
	public constructor() {
		super("The Generate preview apply was superseded.");
	}
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
		case "auto-paint":
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

		case "auto-paint": {
			const rules = resolveTerrainAutoPaintRules(operation.rules ?? readTerrainAutoPaintRules(context.plugin), layers);
			const surfaceAt = createTerrainTexelSurface(context.edit.target, weights.size);

			if (!operation.area) {
				// Whole map in bands of rows of weight 1 with amount 0.25 (min(1, 4 × 0.25 × 1) = 1: new = rules result, §4.10.5).
				const size = weights.size;
				const band = Math.min(size, TERRAIN_AUTO_PAINT_BAND_ROWS);
				const ones = new Float32Array(size * band).fill(1);

				for (let row = 0; row < size; row += band) {
					const rect = { x0: 0, y0: row, x1: size - 1, y1: Math.min(size - 1, row + band - 1) };
					applyTerrainAutoPaint(weights, { rect, stride: size, weights: ones }, rules, surfaceAt, 0.25);

					context.progress((rect.y1 + 1) / size);
					await context.checkpoint();
				}

				return all;
			}

			const dabWeights = createTerrainAreaWeights(context.edit, weights.size, operation.area.centerWorld, operation.area.radiusWorld);
			if (!dabWeights) {
				return {};
			}

			// §4.10.5: new = mix(current, out, a); the brush formula min(1, 4 amount w) gives a with amount = 0.25 and w = a <= 1.
			applyTerrainAutoPaint(weights, dabWeights, rules, surfaceAt, 0.25);
			return weights.maps[1] ? { weights0: dabWeights.rect, weights1: dabWeights.rect } : { weights0: dabWeights.rect };
		}

		default:
			return {};
	}
}

/**
 * Texel surface of the auto-paint rules (§4.10.5): texel centre → local x, z (§4.1); world height of the rendered surface; slope in degrees
 * from the local gradient scaled by the metric.
 * @param target defines the terrain.
 * @param size defines the weight map size.
 */
export function createTerrainTexelSurface(target: ITerrainStrokeTarget, size: number): (tx: number, ty: number) => ITerrainTexelSurface {
	const { grid, metric, heights } = target;

	return (tx, ty) => {
		const x = ((tx + 0.5) / size - 0.5) * grid.width;
		const z = ((ty + 0.5) / size - 0.5) * grid.height;

		const gradient = sampleTerrainGradient(heights, grid, x, z);
		const gx = (gradient.dx * metric.sy) / metric.sx;
		const gz = (gradient.dz * metric.sy) / metric.sz;

		return {
			x,
			z,
			heightWorld: target.localToWorldHeight(sampleTerrainHeight(heights, grid, x, z)),
			slopeDegrees: (Math.atan(Math.sqrt(gx * gx + gz * gz)) * 180) / Math.PI,
		};
	};
}

/**
 * Weights of an auto-paint area (§4.10.5): texels of the disc of centre C and radius R (world cm, measured in the metric-local plane),
 * a = 1 − smoothstep(0.9 R, R, |p − C|); null when the disc misses the weight map.
 * @param edit defines the terrain.
 * @param size defines the weight map size.
 * @param centerWorld defines the world [x, z] centre (cm).
 * @param radiusWorld defines the radius (world cm).
 */
export function createTerrainAreaWeights(edit: ITerrainEditTarget, size: number, centerWorld: readonly [number, number], radiusWorld: number): ITerrainDabWeights | null {
	const { grid, metric } = edit.target;
	const center = projectTerrainWorldPoint(edit, centerWorld[0], centerWorld[1]);
	if (!center || !(radiusWorld > 0)) {
		return null;
	}

	const radiusX = radiusWorld / metric.sx;
	const radiusZ = radiusWorld / metric.sz;

	const tx0 = Math.max(0, Math.floor(((center.x - radiusX) / grid.width + 0.5) * size - 0.5));
	const tx1 = Math.min(size - 1, Math.ceil(((center.x + radiusX) / grid.width + 0.5) * size - 0.5));
	const ty0 = Math.max(0, Math.floor(((center.z - radiusZ) / grid.height + 0.5) * size - 0.5));
	const ty1 = Math.min(size - 1, Math.ceil(((center.z + radiusZ) / grid.height + 0.5) * size - 0.5));

	const rect: ITerrainRect = { x0: tx0, y0: ty0, x1: tx1, y1: ty1 };
	if (isTerrainRectEmpty(rect)) {
		return null;
	}

	const stride = tx1 - tx0 + 1;
	const weights = new Float32Array(stride * (ty1 - ty0 + 1));
	const cx = center.x * metric.sx;
	const cz = center.z * metric.sz;

	for (let ty = ty0; ty <= ty1; ++ty) {
		const mz = ((ty + 0.5) / size - 0.5) * grid.height * metric.sz;
		for (let tx = tx0; tx <= tx1; ++tx) {
			const mx = ((tx + 0.5) / size - 0.5) * grid.width * metric.sx;
			const distance = Math.hypot(mx - cx, mz - cz);
			weights[(ty - ty0) * stride + (tx - tx0)] = 1 - smoothstep(0.9 * radiusWorld, radiusWorld, distance);
		}
	}

	return { rect, stride, weights };
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
 * resources captured first (the journal of the disc for an auto-paint area), slices of ≤ 16 ms, synchronous flush + finalize, then one entry
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

		let journal: TerrainTileJournal | null = null;
		let payload: ITerrainUndoPayload | null = null;

		const areaWeights =
			operation.type === "auto-paint" && operation.area && edit.target.weights
				? createTerrainAreaWeights(edit, edit.target.weights.size, operation.area.centerWorld, operation.area.radiusWorld)
				: null;

		if (operation.type === "auto-paint" && operation.area) {
			if (!areaWeights) {
				return finishResult(edit, {}, warnings);
			}

			journal = new TerrainTileJournal(edit.provider, edit.signature);
			kinds.forEach((kind) => journal!.touch(kind, areaWeights.rect));
		} else {
			payload = createTerrainFullPayload(edit.provider, kinds, edit.signature);
		}

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
			// Restore the start state: the payload (or the journal) holds it.
			const restored = journal ? journal.revert() : (payload?.swap(edit.provider, edit.signature) ?? {});
			payload?.release();

			applyChangedRects(edit, restored, !scope.aborted);
			throw e;
		}

		payload ??= journal?.commit() ?? null;

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
 * Opens the preview transaction of the Generate panel of the Terrain tab: it is the active preview until it closes.
 * Throws TerrainRefusedError ("busy" / "preview-open" / ...) when a stroke, an operation or another preview runs.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 */
export function beginTerrainPreview(editor: Editor, mesh: Mesh): TerrainPreviewTransaction {
	const refusal = getTerrainEditRefusal(editor, mesh, { paint: false });
	if (refusal) {
		throw createTerrainRefusedError(refusal);
	}

	const transaction = new TerrainPreviewTransaction(mesh, (closed) => {
		if (getActiveTerrainPreview() === closed) {
			setActiveTerrainPreview(null);
		}
	});

	setActiveTerrainPreview(transaction);
	return transaction;
}

/**
 * Preview transaction of the Generate panel (§1.13.3, §3.5): each apply restores the preview start state then runs the operation (no undo
 * entry); commit registers one entry (start state ↔ current state); cancel restores the start state. onClosedObservable is notified once,
 * whoever closed it ("cancel" when a commit could not register its entry). A newer apply supersedes a running one; commit or cancel
 * during an apply take effect when it stops. Commit and cancel go through the binding of the first apply: a clone sharing the geometry
 * since then doesn't block them.
 */
export class TerrainPreviewTransaction implements ITerrainPreviewTransaction {
	public readonly mesh: Mesh;
	public readonly onClosedObservable: Observable<"commit" | "cancel"> = new Observable<"commit" | "cancel">();

	private readonly _onClosed: (transaction: TerrainPreviewTransaction, reason: "commit" | "cancel") => void;
	private readonly _meshDisposeObserver: Nullable<Observer<Node>>;

	private _open: boolean = true;
	private _closed: boolean = false;
	private _generation: number = 0;
	private _running: Promise<void> | null = null;
	private _pendingClose: "commit" | "cancel" | null = null;
	private readonly _start: Map<TerrainResourceKind, Float32Array | Uint8Array> = new Map();

	/**
	 * @param mesh defines the terrain.
	 * @param onClosed defines the callback called once when the transaction closes.
	 */
	public constructor(mesh: Mesh, onClosed: (transaction: TerrainPreviewTransaction, reason: "commit" | "cancel") => void) {
		this.mesh = mesh;
		this._onClosed = onClosed;

		// The terrain (or its scene) goes away: closed without touching the data.
		this._meshDisposeObserver = mesh.onDisposeObservable.addOnce(() => this.abandon());
	}

	public get isOpen(): boolean {
		return this._open;
	}

	/** true while an apply runs. */
	public get isApplying(): boolean {
		return this._running !== null;
	}

	/**
	 * Restores the preview start state then applies the operation (no undo entry). Resolves quietly when superseded by a newer apply,
	 * a cancel or a commit request.
	 * @param operation defines the operation to preview.
	 */
	public async apply(operation: TerrainOperation): Promise<void> {
		if (!this._open) {
			return;
		}

		const generation = ++this._generation;

		if (this._running) {
			await this._running.catch(() => {});
		}

		if (generation !== this._generation || !this._open) {
			return;
		}

		const run = this._run(operation, generation);
		this._running = run;

		try {
			await run;
		} finally {
			if (this._running === run) {
				this._running = null;
			}

			this._processPendingClose();
		}
	}

	/** One undo entry: preview start state ↔ current state (deferred until a running apply ends). */
	public commit(): void {
		if (this._closed || this._pendingClose) {
			return;
		}

		this._open = false;

		if (this._running) {
			this._pendingClose = "commit";
			return;
		}

		this._commitNow();
	}

	/** Restores the start state, no undo entry (a running apply is superseded first). */
	public cancel(): void {
		if (this._closed || this._pendingClose === "cancel") {
			return;
		}

		this._open = false;

		if (this._running) {
			this._pendingClose = "cancel";
			++this._generation;
			return;
		}

		this._cancelNow();
	}

	/** Closes with "cancel" without touching the data (scene or mesh disposed). */
	public abandon(): void {
		if (this._closed) {
			return;
		}

		this._open = false;
		++this._generation;
		this._close("cancel");
	}

	private async _run(operation: TerrainOperation, generation: number): Promise<void> {
		const scope = createTerrainBusyScope(TERRAIN_OPERATION_LABELS[operation.type], this.mesh);
		const isCancelled = () => generation !== this._generation || this._pendingClose === "cancel" || this._closed;

		let edit: ITerrainEditTarget | null = null;

		try {
			const plugin = getTerrainMaterialPlugin(this.mesh.material as any);
			if (isTerrainWeightOperation(operation)) {
				if (!plugin) {
					throw createTerrainRefusedError("no-material");
				}

				await waitForTerrainWeightsAsync(plugin, TERRAIN_WEIGHTS_TIMEOUT_MS);

				const refusal = getTerrainWeightsRefusal(this.mesh);
				if (refusal) {
					throw createTerrainRefusedError(refusal);
				}
			}

			if (isCancelled()) {
				throw new TerrainPreviewSupersededError();
			}

			edit = getTerrainEditTarget(this.mesh);
			const kinds = getTerrainOperationResourceKinds(operation, edit);
			this._captureStart(edit, kinds);

			const restored = this._restoreStart(edit);
			markTerrainRectsDirty(edit.target, restored);

			const slicer = new TerrainWorkSlicer();
			const changed = await executeTerrainOperation(operation, {
				edit,
				plugin,
				progress: (value) => scope.setProgress(value),
				checkpoint: async () => {
					await slicer.maybeYield();
					scope.throwIfAborted();
					if (isCancelled()) {
						throw new TerrainPreviewSupersededError();
					}
				},
			});

			scope.throwIfAborted();

			const all = unionTerrainRects(restored, changed);
			applyChangedRects(edit, all, true);
			notifyTerrainChanged(this.mesh, getTerrainChangeKinds(all), "operation");
		} catch (e) {
			if (scope.aborted) {
				this.abandon();
				return;
			}

			if (e instanceof TerrainPreviewSupersededError) {
				return;
			}

			// A failed apply leaves the preview at its start state, through the existing binding when the edit target itself was refused
			// (e.g. "shared-geometry": a clone shares the geometry since the preview started).
			const target = edit ?? (this._start.size ? getExistingTerrainEditTarget(this.mesh) : null);
			if (target) {
				const restored = this._restoreStart(target);
				applyChangedRects(target, restored, true);
				notifyTerrainChanged(this.mesh, getTerrainChangeKinds(restored), "operation");
			}

			throw e;
		} finally {
			scope.dispose();
		}
	}

	/**
	 * Live data holding the preview: the binding created by the first apply, without the sharing refusals of getEditTarget (a graph Clone
	 * sharing the geometry since then shares the preview, so it shares its restore and its undo entry, like undo/redo). When that binding
	 * is gone (geometry replaced since the preview started), a new one through getEditTarget: throws its refusal when there can't be one.
	 */
	private _getStartEditTarget(): ITerrainEditTarget {
		return getExistingTerrainEditTarget(this.mesh) ?? getTerrainEditTarget(this.mesh);
	}

	private _processPendingClose(): void {
		const pending = this._pendingClose;
		if (!pending || this._closed || this._running) {
			return;
		}

		this._pendingClose = null;

		if (pending === "commit") {
			this._commitNow();
		} else {
			this._cancelNow();
		}
	}

	private _captureStart(edit: ITerrainEditTarget, kinds: TerrainResourceKind[]): void {
		for (const kind of kinds) {
			if (this._start.has(kind)) {
				continue;
			}

			const resource = edit.provider(kind);
			if (resource) {
				this._start.set(kind, resource.data.slice());
			}
		}
	}

	/** Writes the start state of every captured kind back into the live data; returns the rects written. */
	private _restoreStart(edit: ITerrainEditTarget): TerrainRectsByKind {
		const restored: TerrainRectsByKind = {};

		this._start.forEach((data, kind) => {
			const resource = edit.provider(kind);
			if (resource && resource.data.length === data.length) {
				resource.data.set(data as any);
				restored[kind] = fullRect(resource.width, resource.height);
			}
		});

		return restored;
	}

	/** Registers the entry (live data of _getStartEditTarget), then closes: "commit" once an entry exists (or nothing was applied), else "cancel". */
	private _commitNow(): void {
		const kinds = Array.from(this._start.keys());
		let registered = false;

		try {
			if (kinds.length && !this.mesh.isDisposed()) {
				const edit = this._getStartEditTarget();

				// The payload must hold the START state while the live data keeps the current one.
				const current = new Map<TerrainResourceKind, Float32Array | Uint8Array>();
				for (const kind of kinds) {
					const resource = edit.provider(kind);
					if (resource) {
						current.set(kind, resource.data.slice());
					}
				}

				this._restoreStart(edit);
				const payload = createTerrainFullPayload(edit.provider, kinds, edit.signature);

				current.forEach((data, kind) => {
					edit.provider(kind)?.data.set(data as any);
				});

				registered = getTerrainUndoStore().register(this.mesh, payload, TERRAIN_OPERATION_UNDO_LABELS.generate) !== null;
			}
		} catch (e) {
			reportPreviewError("commit", e);
		}

		// Observers of "commit" tell the user that undo reverts the preview (toast.preview-applied): only true once an entry exists.
		this._close(registered || !kinds.length ? "commit" : "cancel");
	}

	/** Restores the start state (live data of _getStartEditTarget), then closes with "cancel" (a failed restore is reported with a toast). */
	private _cancelNow(): void {
		try {
			if (this._start.size && !this.mesh.isDisposed()) {
				const edit = this._getStartEditTarget();
				const restored = this._restoreStart(edit);

				applyChangedRects(edit, restored, true);
				notifyTerrainChanged(this.mesh, getTerrainChangeKinds(restored), "operation");
			}
		} catch (e) {
			reportPreviewError("cancel", e);
		}

		this._close("cancel");
	}

	private _close(reason: "commit" | "cancel"): void {
		if (this._closed) {
			return;
		}

		this._closed = true;
		this._open = false;
		this._pendingClose = null;
		this._start.clear();

		this.mesh.onDisposeObservable.remove(this._meshDisposeObserver);

		try {
			this._onClosed(this, reason);
		} catch (e) {
			reportOperationError(e);
		}

		try {
			this.onClosedObservable.notifyObservers(reason);
		} catch (e) {
			reportOperationError(e);
		}
	}
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
 * Mask of one layer (§4.10.8 export): weight / 255 as an N x N image in image order; null when the terrain has no terrain material,
 * no loaded weights or no such layer.
 * @param plugin defines the terrain material plugin.
 * @param weights defines the loaded weights (null when not loaded).
 * @param layerId defines the layer.
 */
export function getTerrainLayerMaskImage(plugin: TerrainMaterialPlugin | null, weights: ITerrainWeightMaps | null, layerId: string): ITerrainImage | null {
	const layerIndex = plugin?.data.layers.findIndex((layer) => layer.id === layerId) ?? -1;
	if (!weights || layerIndex < 0) {
		return null;
	}

	return getTerrainLayerMask(weights, layerIndex);
}

/**
 * Layer mask import (§4.10.8): one undo entry (full payload of the weight maps).
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 * @param layerId defines the layer whose mask is replaced.
 * @param mask defines the mask (image order, 0..1).
 */
export async function setTerrainLayerMaskAsync(editor: Editor, mesh: Mesh, layerId: string, mask: ITerrainImage): Promise<void> {
	const refusal = getTerrainEditRefusal(editor, mesh, { paint: true, ignoreWeightsState: true, engineCall: true });
	if (refusal) {
		throw createTerrainRefusedError(refusal);
	}

	const scope = createTerrainBusyScope("Importing layer mask", mesh);

	try {
		const plugin = getTerrainMaterialPlugin(mesh.material as any);
		if (!plugin) {
			throw createTerrainRefusedError("no-material");
		}

		const layerIndex = getLayerIndexOrThrow(plugin.data.layers, layerId);

		await waitForTerrainWeightsAsync(plugin, TERRAIN_WEIGHTS_TIMEOUT_MS);
		scope.throwIfAborted();

		const refusal = getTerrainWeightsRefusal(mesh);
		if (refusal) {
			throw createTerrainRefusedError(refusal);
		}

		const edit = getTerrainEditTarget(mesh);
		const weights = edit.target.weights;
		if (!weights) {
			throw createTerrainRefusedError("weights-loading");
		}

		const kinds: TerrainResourceKind[] = weights.maps[1] ? ["weights0", "weights1"] : ["weights0"];
		const payload = createTerrainFullPayload(edit.provider, kinds, edit.signature);

		try {
			setTerrainLayerMask(weights, layerIndex, mask);
		} catch (e) {
			payload.swap(edit.provider, edit.signature);
			payload.release();
			throw e;
		}

		const changed = fullWeightRects(weights);
		applyChangedRects(edit, changed, true);

		getTerrainUndoStore().register(mesh, payload, "Import layer mask");
		notifyTerrainChanged(mesh, ["weights"], "operation");
	} finally {
		scope.dispose();
	}
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

function smoothstep(edge0: number, edge1: number, x: number): number {
	if (edge0 === edge1) {
		return x < edge0 ? 0 : 1;
	}

	const t = clamp01((x - edge0) / (edge1 - edge0));
	return t * t * (3 - 2 * t);
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

/** A preview that couldn't be restored or committed closes anyway (its panel may be gone): the user is told with a toast, not only the console. */
function reportPreviewError(action: "cancel" | "commit", error: unknown): void {
	reportOperationError(error);

	const reason = error instanceof Error ? error.message : String(error);
	toast.error(
		action === "cancel"
			? `The terrain couldn't be restored as it was before the Generate preview: ${reason}`
			: `The Generate preview couldn't be added to the undo history: ${reason}`
	);
}
