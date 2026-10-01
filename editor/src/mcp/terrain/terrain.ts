import { extname } from "path/posix";
import { pathExists } from "fs-extra";

import { Node, Quaternion, Scene, Space, TransformNode, Vector3 } from "babylonjs";
import { TERRAIN_MAX_SUBDIVISIONS, TERRAIN_MIN_SUBDIVISIONS } from "babylonjs-editor-tools";

import { addTerrainMesh } from "../../project/add/mesh";

import { registerUndoRedo } from "../../tools/undoredo";
import { isAbstractMesh, isAnyTransformNode } from "../../tools/guards/nodes";

import { getDefaultTerrainSubdivisions } from "../../tools/terrain/core/settings";
import { createDefaultTerrainGenerateParams } from "../../tools/terrain/core/kernels/generate";
import type { ITerrainToolSettings, TerrainBandMode, TerrainPaintTool, TerrainSculptTool } from "../../tools/terrain/core/types";
import { getTerrainDependents } from "../../tools/terrain/engine/dependents";
import { applyTerrainStroke } from "../../tools/terrain/engine/editing";
import { listTerrainMeshes } from "../../tools/terrain/engine/eligibility";
import { getTerrainLayerCoverage, getTerrainMeshInfo, getTerrainPlugin } from "../../tools/terrain/engine/info";
import { applyTerrainOperation, replaceTerrainHeights } from "../../tools/terrain/engine/operations";
import { getTerrainHeightSamples, sampleTerrainLayerWeights, sampleTerrainSurface } from "../../tools/terrain/engine/sampling";
import { resizeTerrain } from "../../tools/terrain/engine/structure";
import type { ITerrainInfo, ITerrainOperationResult, TerrainChangeKind, TerrainOperation } from "../../tools/terrain/engine/types";
import { exportTerrainHeightmap, getTerrainHeightmapSidecarPath, readTerrainHeightmapImport, type ITerrainHeightmapImport } from "../../tools/terrain/io/heightmap";

import { IMCPActionOptions } from "../action";
import { resolveNode } from "../tools/resolve";

import {
	ITerrainMcpStrokeArguments,
	ITerrainMcpTarget,
	TERRAIN_MCP_OUTSIDE_PROJECT_MESSAGE,
	TERRAIN_MCP_WEIGHTS_TIMEOUT_MS,
	applyTerrainMcpFilters,
	assertTerrainMcpHasLayers,
	computeTerrainMcpWorldMatrices,
	buildTerrainMcpStrokeRequest,
	createTerrainMcpSeed,
	createTerrainMcpStrokeSettings,
	getTerrainMcpMetric,
	getTerrainMcpProjectRelativePath,
	getTerrainMcpStrokeResult,
	getTerrainMcpSummary,
	getTerrainMcpWarnings,
	hasTerrainMcpNodeReference,
	isTerrainMcpObject,
	makeTerrainMcpUnique,
	readTerrainMcpBoolean,
	readTerrainMcpEnum,
	readTerrainMcpLayerReference,
	readTerrainMcpNumber,
	readTerrainMcpObject,
	readTerrainMcpPoints,
	readTerrainMcpStrokeArguments,
	readTerrainMcpString,
	readTerrainMcpSubdivisions,
	readTerrainMcpTextureSize,
	readTerrainMcpVector3,
	refreshTerrainMcpAssets,
	requireTerrainMcpProjectDirectory,
	resolveTerrainMcpBrushShapeAsync,
	resolveTerrainMcpLayer,
	resolveTerrainMcpLibraryBrushAsync,
	resolveTerrainMcpPath,
	resolveTerrainMcpTarget,
	roundTerrainMcpRange,
	roundTerrainMcpValue,
	runTerrainMcpMutationAsync,
	runTerrainMcpPreparedMutationAsync,
	throwTerrainMcpInvalidArgument,
	waitForTerrainMcpReadyAsync,
	waitForTerrainMcpWeightsAsync,
} from "./shared";

/**
 * Size, in world centimeters, of a new terrain when create_terrain doesn't give one (§1.13.1).
 */
export const TERRAIN_MCP_NEW_TERRAIN_SIZE = 10240;

/**
 * Maximum size, in world centimeters, of a terrain created by create_terrain or resized by modify_terrain.
 */
export const TERRAIN_MCP_MAX_SIZE = 1000000;

/**
 * Mapping of the sculpt_terrain tools to the engine tools (§8.1 rule 2).
 */
export const TERRAIN_MCP_SCULPT_TOOLS: Readonly<Record<string, { tool: TerrainSculptTool; invert: boolean }>> = {
	raise: { tool: "raise", invert: false },
	lower: { tool: "raise", invert: true },
	smooth: { tool: "smooth", invert: false },
	sharpen: { tool: "smooth", invert: true },
	flatten: { tool: "flatten", invert: false },
	set_height: { tool: "set-height", invert: false },
	ramp: { tool: "ramp", invert: false },
	noise: { tool: "noise", invert: false },
	terrace: { tool: "terrace", invert: false },
	erode: { tool: "erode", invert: false },
	stamp: { tool: "stamp", invert: false },
	hole: { tool: "holes", invert: false },
	fill_hole: { tool: "holes", invert: true },
};

/**
 * Mapping of the paint_terrain tools to the engine tools (§8.1 rule 2).
 */
export const TERRAIN_MCP_PAINT_TOOLS: Readonly<Record<string, { tool: TerrainPaintTool; invert: boolean }>> = {
	paint: { tool: "paint", invert: false },
	erase: { tool: "paint", invert: true },
	blend: { tool: "blend", invert: false },
	replace: { tool: "replace", invert: false },
};

/**
 * Operations of modify_terrain.
 */
export const TERRAIN_MCP_MODIFY_OPERATIONS = [
	"smooth",
	"erode_thermal",
	"erode_hydraulic",
	"terrace",
	"flatten",
	"offset",
	"scale",
	"normalize",
	"clear_holes",
	"resample",
	"resize",
	"fill_layer",
	"normalize_weights",
] as const;

/**
 * Operation of modify_terrain.
 */
export type TerrainMcpModifyOperation = (typeof TERRAIN_MCP_MODIFY_OPERATIONS)[number];

/**
 * Defaults of the modify_terrain operations when their arguments are omitted.
 */
export const TERRAIN_MCP_MODIFY_DEFAULTS = {
	smoothIterations: 3,
	smoothStrength: 1,
	thermalIterations: 10,
	thermalTalus: 35,
	thermalAmount: 0.5,
	hydraulicDroplets: 50000,
	terraceStep: 100,
	terraceSharpness: 0.8,
	terraceOffset: 0,
};

const TERRAIN_MCP_BAND_MODES: readonly TerrainBandMode[] = ["both", "raise", "lower"];

// get_terrain_info

/**
 * get_terrain_info: with a node, the compact summary of the terrain, its dependents and optionally a grid of world heights (row 0 = +Z edge,
 * column 0 = -X edge); without a node, the terrains of the scene.
 */
export async function getTerrainInfo(scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const heightSamples = readTerrainMcpNumber(data, "heightSamples", { integer: true, min: 0, max: 64 });

	if (!hasTerrainMcpNodeReference(data)) {
		return {
			terrains: listTerrainMeshes(scene).map((terrain) => ({
				id: terrain.mesh.id,
				name: terrain.name,
				subdivisions: terrain.subdivisions,
			})),
		};
	}

	const target = resolveTerrainMcpTarget(scene, data, options);
	const terrain = getTerrainMcpSummary(target);

	let dependents: unknown = null;
	try {
		dependents = await getTerrainDependents(target.mesh);
	} catch (e) {
		dependents = null;
	}

	return {
		terrain,
		dependents,
		...(heightSamples
			? {
					heights: (getTerrainHeightSamples(target.mesh, Math.max(2, heightSamples)) ?? []).map((row) => row.map((value) => roundTerrainMcpValue(value))),
				}
			: {}),
	};
}

// create_terrain

/**
 * Message of create_terrain called with a node: it always creates a new terrain (grounds can't become terrains).
 */
export const TERRAIN_MCP_CREATE_NODE_MESSAGE =
	"create_terrain always creates a new terrain: remove nodeId / nodeName (grounds can't become terrains; get_terrain_info lists the terrains of the scene).";

/**
 * create_terrain: adds a new flat terrain (addTerrainMesh: TerrainMesh, default 10240 x 10240 cm, with a new terrain material), selected and
 * not undoable like the other "add mesh" commands. Without subdivisions the resolution is getDefaultTerrainSubdivisions (§4.17), the rule of
 * the New terrain panel.
 */
export async function createTerrain(scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	if (hasTerrainMcpNodeReference(data)) {
		throw new Error(TERRAIN_MCP_CREATE_NODE_MESSAGE);
	}

	const name = readTerrainMcpString(data, "name");
	const width = readTerrainMcpNumber(data, "width", { above: 0, max: TERRAIN_MCP_MAX_SIZE });
	const depth = readTerrainMcpNumber(data, "depth", { above: 0, max: TERRAIN_MCP_MAX_SIZE });
	const subdivisions = readTerrainMcpSubdivisions(data);
	const position = readTerrainMcpVector3(data, "position");
	const parentId = readTerrainMcpString(data, "parentId");
	const weightMapSize = readTerrainMcpTextureSize(data, "weightMapSize");
	const layerTextureSize = readTerrainMcpTextureSize(data, "layerTextureSize");

	const parent = parentId ? resolveNode({ scene, nodeId: parentId }) : null;

	return runTerrainMcpMutationAsync({ editor: options.editor, mesh: null }, async () => {
		const warnings: string[] = [];

		// Lengths are world centimeters (§8.1 rule 7): a parent's scaling applies to the new terrain.
		const metric = getTerrainMcpMetric(parent);
		const worldWidth = width ?? TERRAIN_MCP_NEW_TERRAIN_SIZE;
		const worldDepth = depth ?? TERRAIN_MCP_NEW_TERRAIN_SIZE;

		const mesh = addTerrainMesh(options.editor, parent ?? undefined, {
			name,
			subdivisions: subdivisions ?? getDefaultTerrainSubdivisions(worldWidth, worldDepth),
			width: worldWidth / metric.sx,
			height: worldDepth / metric.sz,
			weightMapSize,
			layerTextureSize,
		});

		if (position) {
			mesh.position.copyFrom(Vector3.FromArray(position));
			mesh.computeWorldMatrix(true);
		}

		const target: ITerrainMcpTarget = { editor: options.editor, scene, mesh };
		await waitForTerrainMcpReadyAsync(target, warnings);

		return {
			terrain: getTerrainMcpSummary(target),
			...getTerrainMcpWarnings(warnings),
		};
	});
}

// sculpt_terrain

/**
 * Validated tool options of sculpt_terrain.
 */
export interface ITerrainMcpSculptArguments {
	seed?: number;
	targetHeight?: number;
	flatten?: { target?: "stroke_start" | "fixed" | "slope"; mode?: TerrainBandMode };
	noise?: {
		type?: "fbm" | "ridged" | "billow";
		scale?: number;
		amplitude?: number;
		octaves?: number;
		persistence?: number;
		lacunarity?: number;
		mode?: "bipolar" | "raise";
	};
	stamp?: { height?: number; blend?: "add" | "max" | "min" | "replace" };
	terrace?: { step?: number; sharpness?: number; offset?: number };
	erode?: { type?: "thermal" | "hydraulic"; talus?: number; iterations?: number; droplets?: number };
	ramp?: { startHeight?: number; endHeight?: number; sideFalloff?: number };
}

/**
 * Reads and validates the tool options of sculpt_terrain (ranges of §8.1).
 * @param data defines the arguments of the tool.
 */
export function readTerrainMcpSculptArguments(data: unknown): ITerrainMcpSculptArguments {
	const flatten = readTerrainMcpObject(data, "flatten");
	const noise = readTerrainMcpObject(data, "noise");
	const stamp = readTerrainMcpObject(data, "stamp");
	const terrace = readTerrainMcpObject(data, "terrace");
	const erode = readTerrainMcpObject(data, "erode");
	const ramp = readTerrainMcpObject(data, "ramp");

	return {
		seed: readTerrainMcpNumber(data, "seed", { integer: true }),
		targetHeight: readTerrainMcpNumber(data, "targetHeight"),
		flatten: flatten && {
			target: readTerrainMcpEnum(flatten, "target", ["stroke_start", "fixed", "slope"] as const, "flatten.target"),
			mode: readTerrainMcpEnum(flatten, "mode", TERRAIN_MCP_BAND_MODES, "flatten.mode"),
		},
		noise: noise && {
			type: readTerrainMcpEnum(noise, "type", ["fbm", "ridged", "billow"] as const, "noise.type"),
			scale: readTerrainMcpNumber(noise, "scale", { above: 0 }, "noise.scale"),
			amplitude: readTerrainMcpNumber(noise, "amplitude", {}, "noise.amplitude"),
			octaves: readTerrainMcpNumber(noise, "octaves", { integer: true, min: 1, max: 10 }, "noise.octaves"),
			persistence: readTerrainMcpNumber(noise, "persistence", { min: 0, max: 1 }, "noise.persistence"),
			lacunarity: readTerrainMcpNumber(noise, "lacunarity", { min: 1, max: 4 }, "noise.lacunarity"),
			mode: readTerrainMcpEnum(noise, "mode", ["bipolar", "raise"] as const, "noise.mode"),
		},
		stamp: stamp && {
			height: readTerrainMcpNumber(stamp, "height", {}, "stamp.height"),
			blend: readTerrainMcpEnum(stamp, "blend", ["add", "max", "min", "replace"] as const, "stamp.blend"),
		},
		terrace: terrace && {
			step: readTerrainMcpNumber(terrace, "step", { above: 0 }, "terrace.step"),
			sharpness: readTerrainMcpNumber(terrace, "sharpness", { min: 0, max: 1 }, "terrace.sharpness"),
			offset: readTerrainMcpNumber(terrace, "offset", {}, "terrace.offset"),
		},
		erode: erode && {
			type: readTerrainMcpEnum(erode, "type", ["thermal", "hydraulic"] as const, "erode.type"),
			talus: readTerrainMcpNumber(erode, "talus", { min: 0, max: 89 }, "erode.talus"),
			iterations: readTerrainMcpNumber(erode, "iterations", { integer: true, min: 1, max: 50 }, "erode.iterations"),
			droplets: readTerrainMcpNumber(erode, "droplets", { integer: true, min: 1, max: 200000 }, "erode.droplets"),
		},
		ramp: ramp && {
			startHeight: readTerrainMcpNumber(ramp, "startHeight", {}, "ramp.startHeight"),
			endHeight: readTerrainMcpNumber(ramp, "endHeight", {}, "ramp.endHeight"),
			sideFalloff: readTerrainMcpNumber(ramp, "sideFalloff", { min: 0, max: 1 }, "ramp.sideFalloff"),
		},
	};
}

/**
 * Applies the options of the sculpt tool to the stroke settings (§8.1 rule 2: stroke_start → stroke-start; ramp ends from the first and last
 * points; stamps are spaced along the stroke, so one point gives one stamp).
 * @param target defines the terrain.
 * @param settings defines the tool settings of the stroke.
 * @param tool defines the engine tool.
 * @param sculpt defines the validated tool options.
 * @param stroke defines the validated stroke arguments.
 * @param seed defines the seed of the stroke (also the seed of the noise tool).
 */
export function applyTerrainMcpSculptOptions(
	target: ITerrainMcpTarget,
	settings: ITerrainToolSettings,
	tool: TerrainSculptTool,
	sculpt: ITerrainMcpSculptArguments,
	stroke: ITerrainMcpStrokeArguments,
	seed: number
): void {
	const options = settings.sculpt;

	switch (tool) {
		case "flatten": {
			const mode = sculpt.flatten?.target;
			options.flatten.target = mode === "stroke_start" ? "stroke-start" : (mode ?? (sculpt.targetHeight !== undefined ? "fixed" : "stroke-start"));
			options.flatten.heightWorld = sculpt.targetHeight ?? options.flatten.heightWorld;
			options.flatten.mode = sculpt.flatten?.mode ?? options.flatten.mode;
			break;
		}

		case "set-height": {
			options.setHeight.heightWorld = sculpt.targetHeight ?? options.setHeight.heightWorld;
			options.setHeight.mode = sculpt.flatten?.mode ?? options.setHeight.mode;
			break;
		}

		case "noise": {
			const noise = sculpt.noise ?? {};
			options.noise.type = noise.type ?? options.noise.type;
			options.noise.scale = noise.scale ?? options.noise.scale;
			options.noise.amplitude = noise.amplitude ?? options.noise.amplitude;
			options.noise.octaves = noise.octaves ?? options.noise.octaves;
			options.noise.persistence = noise.persistence ?? options.noise.persistence;
			options.noise.lacunarity = noise.lacunarity ?? options.noise.lacunarity;
			options.noise.mode = noise.mode ?? options.noise.mode;
			options.noise.seed = seed;
			break;
		}

		case "terrace": {
			options.terrace.step = sculpt.terrace?.step ?? options.terrace.step;
			options.terrace.sharpness = sculpt.terrace?.sharpness ?? options.terrace.sharpness;
			options.terrace.offset = sculpt.terrace?.offset ?? options.terrace.offset;
			break;
		}

		case "erode": {
			options.erode.type = sculpt.erode?.type ?? options.erode.type;
			options.erode.talusDegrees = sculpt.erode?.talus ?? options.erode.talusDegrees;
			options.erode.iterations = sculpt.erode?.iterations ?? options.erode.iterations;
			options.erode.droplets = sculpt.erode?.droplets ?? options.erode.droplets;
			break;
		}

		case "stamp": {
			options.stamp.heightWorld = sculpt.stamp?.height ?? options.stamp.heightWorld;
			options.stamp.blend = sculpt.stamp?.blend ?? options.stamp.blend;
			options.stamp.onClickOnly = false;
			break;
		}

		case "ramp": {
			options.ramp.sideFalloff = sculpt.ramp?.sideFalloff ?? options.ramp.sideFalloff;

			const start = sculpt.ramp?.startHeight;
			const end = sculpt.ramp?.endHeight;

			if (start !== undefined || end !== undefined) {
				const first = stroke.points[0];
				const last = stroke.points[stroke.points.length - 1];

				options.ramp.endHeights = "custom";
				options.ramp.startWorld = start ?? sampleTerrainSurface(target.mesh, first[0], first[1])?.heightWorld ?? end!;
				options.ramp.endWorld = end ?? sampleTerrainSurface(target.mesh, last[0], last[1])?.heightWorld ?? start!;
			}
			break;
		}
	}
}

/**
 * sculpt_terrain: one headless stroke along world points (§8.1 rule 2), one undo entry (plus one per automatic "make unique").
 */
export async function sculptTerrain(scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const target = resolveTerrainMcpTarget(scene, data, options);

	const toolName = readTerrainMcpEnum(data, "tool", Object.keys(TERRAIN_MCP_SCULPT_TOOLS));
	if (!toolName) {
		throwTerrainMcpInvalidArgument("tool", `one of ${Object.keys(TERRAIN_MCP_SCULPT_TOOLS).join(", ")}`);
	}

	const mapping = TERRAIN_MCP_SCULPT_TOOLS[toolName];
	const stroke = readTerrainMcpStrokeArguments(data);
	const sculpt = readTerrainMcpSculptArguments(data);

	if (mapping.tool === "ramp" && stroke.points.length < 2) {
		throw new Error("The ramp tool needs at least two points: the ramp goes from the first point to the last one.");
	}

	if (mapping.tool === "set-height" && sculpt.targetHeight === undefined) {
		throw new Error("The set_height tool needs targetHeight (world cm).");
	}

	if (mapping.tool === "flatten" && sculpt.flatten?.target === "fixed" && sculpt.targetHeight === undefined) {
		throw new Error('The flatten tool with target "fixed" needs targetHeight (world cm).');
	}

	return runTerrainMcpPreparedMutationAsync(
		target,
		// Brush, shape and weights (layer filter) before the mutation: see runTerrainMcpPreparedMutationAsync.
		async () => {
			const warnings: string[] = [];

			const brush = await resolveTerrainMcpLibraryBrushAsync(stroke.brush);
			const settings = createTerrainMcpStrokeSettings(mapping.tool, stroke, brush);
			const shape = await resolveTerrainMcpBrushShapeAsync(brush, settings, warnings);
			const weightsTimeoutMs = stroke.filters?.layer ? await waitForTerrainMcpWeightsAsync(target) : TERRAIN_MCP_WEIGHTS_TIMEOUT_MS;

			return { warnings, settings, shape, weightsTimeoutMs };
		},
		async ({ warnings, settings, shape, weightsTimeoutMs }) => {
			applyTerrainMcpFilters(target, settings, stroke.filters);

			const seed = sculpt.seed ?? createTerrainMcpSeed();
			applyTerrainMcpSculptOptions(target, settings, mapping.tool, sculpt, stroke, seed);

			const request = buildTerrainMcpStrokeRequest(settings, shape, null, mapping.invert, seed);

			const points = mapping.tool === "ramp" ? [stroke.points[0], stroke.points[stroke.points.length - 1]] : stroke.points;
			const result = await applyTerrainStroke(target.editor, target.mesh, request, points, {
				autoFixSharing: stroke.autoFixSharing ?? true,
				weightsTimeoutMs,
			});

			return getTerrainMcpStrokeResult(result, warnings);
		}
	);
}

// paint_terrain

/**
 * paint_terrain: one headless paint stroke along world points (§8.1 rule 2), one undo entry (plus one per automatic "make unique"). Waits
 * up to 30 s for weights that are still loading, then for the terrain to render the result, and returns the coverage of every layer.
 */
export async function paintTerrain(scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const target = resolveTerrainMcpTarget(scene, data, options);

	const toolName = readTerrainMcpEnum(data, "tool", Object.keys(TERRAIN_MCP_PAINT_TOOLS)) ?? "paint";
	const mapping = TERRAIN_MCP_PAINT_TOOLS[toolName];

	const layerReference = readTerrainMcpLayerReference(data, "layer");
	if (layerReference === undefined) {
		throwTerrainMcpInvalidArgument("layer", "a layer index (0 = first layer), id or name");
	}

	const fromLayerReference = readTerrainMcpLayerReference(data, "fromLayer");
	const opacity = readTerrainMcpNumber(data, "opacity", { min: 0, max: 1 });
	const stroke = readTerrainMcpStrokeArguments(data);

	if (mapping.tool === "replace" && fromLayerReference === undefined) {
		throw new Error("The replace tool needs fromLayer: the layer replaced by the painted layer.");
	}

	assertTerrainMcpHasLayers(target);
	resolveTerrainMcpLayer(target, layerReference);
	if (fromLayerReference !== undefined) {
		resolveTerrainMcpLayer(target, fromLayerReference);
	}

	return runTerrainMcpPreparedMutationAsync(
		target,
		// Brush, shape and the weights still loading before the mutation: see runTerrainMcpPreparedMutationAsync.
		async () => {
			const warnings: string[] = [];

			const brush = await resolveTerrainMcpLibraryBrushAsync(stroke.brush);
			const settings = createTerrainMcpStrokeSettings(mapping.tool, stroke, brush);
			settings.paint.opacity = opacity ?? settings.paint.opacity;

			const shape = await resolveTerrainMcpBrushShapeAsync(brush, settings, warnings);
			const weightsTimeoutMs = await waitForTerrainMcpWeightsAsync(target);

			return { warnings, settings, shape, weightsTimeoutMs };
		},
		async ({ warnings, settings, shape, weightsTimeoutMs }) => {
			assertTerrainMcpHasLayers(target);

			const layer = resolveTerrainMcpLayer(target, layerReference);
			const fromLayer = fromLayerReference === undefined ? null : resolveTerrainMcpLayer(target, fromLayerReference);
			if (fromLayer) {
				settings.paint.replaceFromLayerId = fromLayer.id;
			}

			applyTerrainMcpFilters(target, settings, stroke.filters);

			const request = buildTerrainMcpStrokeRequest(settings, shape, layer.id, mapping.invert, createTerrainMcpSeed());

			const result = await applyTerrainStroke(target.editor, target.mesh, request, stroke.points, {
				autoFixSharing: stroke.autoFixSharing ?? true,
				weightsTimeoutMs,
			});

			await waitForTerrainMcpReadyAsync(target, warnings);

			return {
				...getTerrainMcpStrokeResult(result, warnings),
				coverage: (getTerrainLayerCoverage(target.mesh) ?? []).map((value) => roundTerrainMcpValue(value, 4)),
			};
		}
	);
}

// generate_terrain

/**
 * Validated arguments of generate_terrain.
 */
interface ITerrainMcpGenerateArguments {
	type?: "fbm" | "ridged" | "billow" | "islands";
	seed?: number;
	scale?: number;
	minHeight?: number;
	maxHeight?: number;
	octaves?: number;
	persistence?: number;
	lacunarity?: number;
	warp?: number;
	edgeFalloff?: "none" | "island";
	erosionDroplets?: number;
	terraceSteps?: number;
	mode?: "replace" | "add";
}

function readTerrainMcpGenerateArguments(data: unknown): ITerrainMcpGenerateArguments {
	const minHeight = readTerrainMcpNumber(data, "minHeight");
	const maxHeight = readTerrainMcpNumber(data, "maxHeight");
	if (minHeight !== undefined && maxHeight !== undefined && maxHeight < minHeight) {
		throw new Error("maxHeight must be greater than or equal to minHeight.");
	}

	return {
		type: readTerrainMcpEnum(data, "type", ["fbm", "ridged", "billow", "islands"] as const),
		seed: readTerrainMcpNumber(data, "seed", { integer: true }),
		scale: readTerrainMcpNumber(data, "scale", { above: 0 }),
		minHeight,
		maxHeight,
		octaves: readTerrainMcpNumber(data, "octaves", { integer: true, min: 1, max: 10 }),
		persistence: readTerrainMcpNumber(data, "persistence", { min: 0, max: 1 }),
		lacunarity: readTerrainMcpNumber(data, "lacunarity", { min: 1, max: 4 }),
		warp: readTerrainMcpNumber(data, "warp", { min: 0, max: 2 }),
		edgeFalloff: readTerrainMcpEnum(data, "edgeFalloff", ["none", "island"] as const),
		erosionDroplets: readTerrainMcpNumber(data, "erosionDroplets", { integer: true, min: 0, max: 200000 }),
		terraceSteps: readTerrainMcpNumber(data, "terraceSteps", { integer: true, min: 0, max: 64 }),
		mode: readTerrainMcpEnum(data, "mode", ["replace", "add"] as const),
	};
}

/**
 * generate_terrain: procedural relief of the whole terrain (§4.11) with the defaults of createDefaultTerrainGenerateParams (§8.1 rule 12),
 * one undo entry. When only one of minHeight/maxHeight is given beyond the default range of the other, the other one keeps the default
 * amplitude. Returns the seed used and the new world height range.
 */
export async function generateTerrain(scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const target = resolveTerrainMcpTarget(scene, data, options);
	const args = readTerrainMcpGenerateArguments(data);

	return runTerrainMcpMutationAsync(target, async () => {
		const warnings = makeTerrainMcpUnique(target, { material: false });

		const info = getTerrainMeshInfo(target.mesh);
		const metric = getTerrainMcpMetric(target.mesh);

		// W/H in world cm (§3.4 createDefaultTerrainGenerateParams).
		const params = createDefaultTerrainGenerateParams(info.width * metric.sx, info.height * metric.sz);
		const span = params.maxWorld - params.minWorld;

		params.type = args.type ?? params.type;
		params.seed = args.seed ?? params.seed;
		params.scale = args.scale ?? params.scale;
		params.octaves = args.octaves ?? params.octaves;
		params.persistence = args.persistence ?? params.persistence;
		params.lacunarity = args.lacunarity ?? params.lacunarity;
		params.warp = args.warp ?? params.warp;
		params.edgeFalloff = args.edgeFalloff ?? (params.type === "islands" ? "island" : params.edgeFalloff);
		params.erosionDroplets = args.erosionDroplets ?? params.erosionDroplets;
		params.terraceSteps = args.terraceSteps ?? params.terraceSteps;

		if (args.minHeight !== undefined && args.maxHeight !== undefined) {
			params.minWorld = args.minHeight;
			params.maxWorld = args.maxHeight;
		} else if (args.minHeight !== undefined) {
			params.minWorld = args.minHeight;
			params.maxWorld = Math.max(params.maxWorld, args.minHeight + span);
		} else if (args.maxHeight !== undefined) {
			params.maxWorld = args.maxHeight;
			params.minWorld = Math.min(params.minWorld, args.maxHeight - span);
		}

		const result = await applyTerrainOperation(target.editor, target.mesh, { type: "generate", params, mode: args.mode ?? "replace" });

		return {
			seed: params.seed,
			worldHeightRange: roundTerrainMcpRange(result.worldHeightRange),
			...getTerrainMcpWarnings([...warnings, ...result.warnings]),
		};
	});
}

// modify_terrain

/**
 * Validated arguments of modify_terrain.
 */
interface ITerrainMcpModifyArguments {
	operation: TerrainMcpModifyOperation;
	layer?: number | string;
	iterations?: number;
	strength?: number;
	talus?: number;
	amount?: number;
	droplets?: number;
	seed?: number;
	step?: number;
	sharpness?: number;
	offset?: number;
	height?: number;
	factor?: number;
	pivot?: number;
	minHeight?: number;
	maxHeight?: number;
	subdivisions?: number;
	width?: number;
	depth?: number;
}

function readTerrainMcpModifyArguments(data: unknown): ITerrainMcpModifyArguments {
	const operation = readTerrainMcpEnum(data, "operation", TERRAIN_MCP_MODIFY_OPERATIONS);
	if (!operation) {
		throwTerrainMcpInvalidArgument("operation", `one of ${TERRAIN_MCP_MODIFY_OPERATIONS.join(", ")}`);
	}

	const args: ITerrainMcpModifyArguments = {
		operation,
		layer: readTerrainMcpLayerReference(data, "layer"),
		iterations: readTerrainMcpNumber(data, "iterations", { integer: true, min: 1, max: 50 }),
		strength: readTerrainMcpNumber(data, "strength", { min: 0, max: 1 }),
		talus: readTerrainMcpNumber(data, "talus", { min: 0, max: 89 }),
		amount: readTerrainMcpNumber(data, "amount", { min: 0, max: 1 }),
		droplets: readTerrainMcpNumber(data, "droplets", { integer: true, min: 1, max: 200000 }),
		seed: readTerrainMcpNumber(data, "seed", { integer: true }),
		step: readTerrainMcpNumber(data, "step", { above: 0 }),
		sharpness: readTerrainMcpNumber(data, "sharpness", { min: 0, max: 1 }),
		offset: readTerrainMcpNumber(data, "offset"),
		height: readTerrainMcpNumber(data, "height"),
		factor: readTerrainMcpNumber(data, "factor", { above: 0 }),
		pivot: readTerrainMcpNumber(data, "pivot"),
		minHeight: readTerrainMcpNumber(data, "minHeight"),
		maxHeight: readTerrainMcpNumber(data, "maxHeight"),
		subdivisions: readTerrainMcpSubdivisions(data),
		width: readTerrainMcpNumber(data, "width", { above: 0, max: TERRAIN_MCP_MAX_SIZE }),
		depth: readTerrainMcpNumber(data, "depth", { above: 0, max: TERRAIN_MCP_MAX_SIZE }),
	};

	switch (operation) {
		case "flatten":
			if (args.height === undefined) {
				throw new Error('The "flatten" operation needs height (world cm).');
			}
			break;

		case "offset":
			if (args.height === undefined && args.offset === undefined) {
				throw new Error('The "offset" operation needs height: the amount in cm added to every height.');
			}
			break;

		case "scale":
			if (args.factor === undefined) {
				throw new Error('The "scale" operation needs factor.');
			}
			break;

		case "normalize":
			if (args.minHeight === undefined || args.maxHeight === undefined) {
				throw new Error('The "normalize" operation needs minHeight and maxHeight (world cm).');
			}

			if (args.maxHeight < args.minHeight) {
				throw new Error("maxHeight must be greater than or equal to minHeight.");
			}
			break;

		case "resample":
			if (args.subdivisions === undefined) {
				throw new Error('The "resample" operation needs subdivisions (64, 128, 256, 512 or 1024).');
			}
			break;

		case "resize":
			if (args.width === undefined && args.depth === undefined && args.subdivisions === undefined) {
				throw new Error('The "resize" operation needs width, depth (world cm) or subdivisions.');
			}
			break;

		case "fill_layer":
			if (args.layer === undefined) {
				throw new Error('The "fill_layer" operation needs layer: the layer that covers the whole terrain.');
			}
			break;
	}

	return args;
}

/**
 * Returns the engine operation of a modify_terrain call (resample and resize excepted: they go through resizeTerrain).
 * @param target defines the terrain.
 * @param args defines the validated arguments.
 */
export function getTerrainMcpModifyOperation(target: ITerrainMcpTarget, args: ITerrainMcpModifyArguments): TerrainOperation {
	const defaults = TERRAIN_MCP_MODIFY_DEFAULTS;

	switch (args.operation) {
		case "smooth":
			return { type: "smooth", iterations: args.iterations ?? defaults.smoothIterations, strength: args.strength ?? defaults.smoothStrength };

		case "erode_thermal":
			return {
				type: "erode-thermal",
				iterations: args.iterations ?? defaults.thermalIterations,
				talusDegrees: args.talus ?? defaults.thermalTalus,
				amount: args.amount ?? defaults.thermalAmount,
			};

		case "erode_hydraulic":
			return { type: "erode-hydraulic", droplets: args.droplets ?? defaults.hydraulicDroplets, seed: args.seed ?? createTerrainMcpSeed() };

		case "terrace":
			return {
				type: "terrace",
				step: args.step ?? defaults.terraceStep,
				sharpness: args.sharpness ?? defaults.terraceSharpness,
				offset: args.offset ?? defaults.terraceOffset,
			};

		case "flatten":
			return { type: "flatten", heightWorld: args.height! };

		case "offset":
			return { type: "offset", amountWorld: args.height ?? args.offset! };

		case "scale":
			return { type: "scale", factor: args.factor!, pivotWorld: args.pivot ?? getTerrainMeshInfo(target.mesh).worldHeightRange[0] };

		case "normalize":
			return { type: "normalize", minWorld: args.minHeight!, maxWorld: args.maxHeight! };

		case "clear_holes":
			return { type: "clear-holes" };

		case "fill_layer":
			return { type: "fill-layer", layerId: resolveTerrainMcpLayer(target, args.layer).id };

		case "normalize_weights":
			return { type: "normalize-weights" };

		default:
			throw new Error(`The "${args.operation}" operation is not a whole-terrain operation.`);
	}
}

/**
 * Warning of a modify_terrain resample / resize that asks for the current size and resolution (no undo entry, `changed` empty).
 */
export const TERRAIN_MCP_RESIZE_NOOP_WARNING = "Nothing changed: the terrain already has this size and resolution.";

/**
 * Returns whether or not resizeTerrain would leave the terrain unchanged (the early return of resizeTerrain, §6.12): the requested local
 * size and resolution (the current ones when omitted) equal the current grid, and the current resolution is already a supported one
 * (resizeTerrain clamps an unsupported resolution, which is a change).
 * @param info defines the current grid of the terrain (local cm, unrounded).
 * @param options defines the options given to resizeTerrain(options.editor, local cm).
 */
export function isTerrainMcpResizeNoop(
	info: Pick<ITerrainInfo, "subdivisions" | "width" | "height">,
	options: { subdivisions?: number; width?: number; height?: number }
): boolean {
	const current = info.subdivisions;
	if (!Number.isInteger(current) || current < TERRAIN_MIN_SUBDIVISIONS || current > TERRAIN_MAX_SUBDIVISIONS) {
		return false;
	}

	return (options.subdivisions ?? current) === current && (options.width ?? info.width) === info.width && (options.height ?? info.height) === info.height;
}

function getTerrainMcpResizeResult(target: ITerrainMcpTarget, changed: TerrainChangeKind[], warnings: string[]): ITerrainOperationResult & Record<string, unknown> {
	const summary = getTerrainMcpSummary(target);

	return {
		changed,
		worldHeightRange: summary.worldHeightRange,
		warnings,
		subdivisions: summary.subdivisions,
		width: summary.width,
		depth: summary.depth,
	};
}

/**
 * modify_terrain: one whole-terrain operation (§3.5 TerrainOperation), or a resample / resize (resizeTerrain, lengths in world cm), one undo
 * entry (plus one per automatic "make unique"). A resample / resize to the current size and resolution changes nothing: no undo entry,
 * `changed` empty and a warning.
 */
export async function modifyTerrain(scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const target = resolveTerrainMcpTarget(scene, data, options);
	const args = readTerrainMcpModifyArguments(data);

	const weightOperation = args.operation === "fill_layer" || args.operation === "normalize_weights";
	if (weightOperation) {
		assertTerrainMcpHasLayers(target);
	}

	return runTerrainMcpMutationAsync(target, async (): Promise<ITerrainOperationResult & Record<string, unknown>> => {
		const resize = args.operation === "resample" || args.operation === "resize";

		if (resize) {
			const metric = getTerrainMcpMetric(target.mesh);
			const options = {
				subdivisions: args.subdivisions,
				width: args.width === undefined ? undefined : args.width / metric.sx,
				height: args.depth === undefined ? undefined : args.depth / metric.sz,
			};

			// resizeTerrain does nothing (no undo entry) when the size and the resolution don't change: nothing is made unique for it either.
			if (isTerrainMcpResizeNoop(getTerrainMeshInfo(target.mesh), options)) {
				return getTerrainMcpResizeResult(target, [], [TERRAIN_MCP_RESIZE_NOOP_WARNING]);
			}

			// Resizes refuse a shared geometry: it is made unique first (own undo entry, §6.12).
			const warnings = makeTerrainMcpUnique(target, { material: false });

			const before = getTerrainMeshInfo(target.mesh);
			await resizeTerrain(target.editor, target.mesh, options);
			const after = getTerrainMeshInfo(target.mesh);

			// Exact comparison of the local grid values resizeTerrain compares (never the rounded world values of the summary).
			if (after.subdivisions === before.subdivisions && after.width === before.width && after.height === before.height) {
				return getTerrainMcpResizeResult(target, [], [...warnings, TERRAIN_MCP_RESIZE_NOOP_WARNING]);
			}

			const changed: TerrainChangeKind[] = after.subdivisions !== before.subdivisions ? ["grid", "heights", "holes"] : ["grid", "heights"];
			return getTerrainMcpResizeResult(target, changed, warnings);
		}

		// The other operations refuse a shared geometry (and, for weight operations, a shared terrain material): made unique first (own undo
		// entries).
		const warnings = makeTerrainMcpUnique(target, { material: weightOperation });

		if (weightOperation) {
			assertTerrainMcpHasLayers(target);
		}

		const result = await applyTerrainOperation(target.editor, target.mesh, getTerrainMcpModifyOperation(target, args));

		if (weightOperation) {
			await waitForTerrainMcpReadyAsync(target, warnings);
		}

		return {
			changed: result.changed.slice(),
			worldHeightRange: roundTerrainMcpRange(result.worldHeightRange),
			warnings: [...warnings, ...result.warnings],
		};
	});
}

// import_terrain_heightmap / export_terrain_heightmap

/**
 * Heightmap read by import_terrain_heightmap before its mutation, with the range and orientation to apply.
 */
/**
 * Reads a heightmap to import (§4.12) with the defaults of importTerrainHeightmap (io/heightmap.ts readTerrainHeightmapImport): minHeight /
 * maxHeight / flipY default to the `<file>.heightmap.json` sidecar ("No height range: ..." without one), the size of a RAW file to the
 * sidecar's width and height. Nothing is applied: import_terrain_heightmap reads and decodes the file before its mutation (see
 * runTerrainMcpPreparedMutationAsync).
 * @param absolutePath defines the absolute path of the heightmap.
 * @param options defines the range, the vertical flip and the size of a RAW file given to the tool.
 */
export function readTerrainMcpHeightmapAsync(
	absolutePath: string,
	options: { minHeight?: number; maxHeight?: number; flipY?: boolean; rawWidth?: number; rawHeight?: number }
): Promise<ITerrainHeightmapImport> {
	return readTerrainHeightmapImport(absolutePath, {
		minWorld: options.minHeight,
		maxWorld: options.maxHeight,
		flipY: options.flipY,
		rawWidth: options.rawWidth,
		rawHeight: options.rawHeight,
	});
}

/**
 * import_terrain_heightmap: replaces (or adds, max, min) the heights from a heightmap image (§4.12) through replaceTerrainHeights, one undo
 * entry. minHeight / maxHeight / flipY default to the `<file>.heightmap.json` sidecar written by export_terrain_heightmap. The file is read
 * and decoded before the mutation.
 */
export async function importTerrainHeightmapEndpoint(scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const target = resolveTerrainMcpTarget(scene, data, options);

	const path = readTerrainMcpString(data, "path") ?? throwTerrainMcpInvalidArgument("path", "the project-relative or absolute path of a heightmap");
	const minHeight = readTerrainMcpNumber(data, "minHeight");
	const maxHeight = readTerrainMcpNumber(data, "maxHeight");
	const mode = readTerrainMcpEnum(data, "mode", ["replace", "add", "max", "min"] as const) ?? "replace";
	const flipY = readTerrainMcpBoolean(data, "flipY");
	const rawWidth = readTerrainMcpNumber(data, "rawWidth", { integer: true, above: 0 });
	const rawHeight = readTerrainMcpNumber(data, "rawHeight", { integer: true, above: 0 });

	return runTerrainMcpPreparedMutationAsync(
		target,
		() => readTerrainMcpHeightmapAsync(resolveTerrainMcpPath(path), { minHeight, maxHeight, flipY, rawWidth, rawHeight }),
		async (heightmap) => {
			const warnings = makeTerrainMcpUnique(target, { material: false });

			await replaceTerrainHeights(target.editor, target.mesh, heightmap.image, {
				minWorld: heightmap.minWorld,
				maxWorld: heightmap.maxWorld,
				mode,
				flipY: heightmap.flipY,
			});

			return {
				worldHeightRange: roundTerrainMcpRange(getTerrainMeshInfo(target.mesh).worldHeightRange),
				bitDepth: heightmap.bitDepth,
				minHeight: heightmap.minWorld,
				maxHeight: heightmap.maxWorld,
				...getTerrainMcpWarnings(warnings),
			};
		}
	);
}

/**
 * Format written by export_terrain_heightmap for each heightmap extension (the rule of the export dialog of the Terrain tab).
 */
export const TERRAIN_MCP_HEIGHTMAP_EXPORT_EXTENSIONS: Readonly<Record<string, "png16" | "raw16">> = {
	".png": "png16",
	".r16": "raw16",
	".raw": "raw16",
};

/**
 * Message of export_terrain_heightmap for a destination inside a `*.scene` folder (saving the scene deletes the files it didn't write there).
 */
export const TERRAIN_MCP_SCENE_FOLDER_MESSAGE = "The destination can't be inside a scene folder: saving the scene would delete it.";

/**
 * Returns whether or not a project-relative path is inside a `*.scene` folder (saving the scene deletes the files it didn't write there).
 * @param relativePath defines the project-relative path ("/" separators).
 */
export function isTerrainMcpPathInSceneFolder(relativePath: string): boolean {
	const folders = relativePath.split("/").slice(0, -1);
	return folders.some((folder) => folder.toLowerCase().endsWith(".scene"));
}

/**
 * Returns the message of export_terrain_heightmap for a destination that exists and is not a heightmap written by the tool (no sidecar).
 * @param relativePath defines the project-relative path of the destination.
 */
export function getTerrainMcpExportOverwriteMessage(relativePath: string): string {
	return `"${relativePath}" already exists and isn't a heightmap exported by export_terrain_heightmap: choose another path.`;
}

/**
 * Returns the message of export_terrain_heightmap for a format that contradicts the extension of the destination.
 * @param format defines the format given to the tool.
 * @param extension defines the extension of the destination (lower case).
 */
export function getTerrainMcpExportFormatMessage(format: string, extension: string): string {
	return `The format "${format}" doesn't match the extension "${extension}": use ".png" for png16, ".r16" or ".raw" for raw16.`;
}

/**
 * export_terrain_heightmap: writes the heights as a 16-bit PNG or RAW16 heightmap plus its `.heightmap.json` sidecar (§4.12), inside the
 * project folder only (§8.1 rule 6). Like the export dialog of the Terrain tab, the extension gives the format (".png" png16, ".r16" / ".raw"
 * raw16; a contradicting `format` is refused) and a path without one of these extensions gets ".png" (".r16" for raw16), so no other kind of
 * file can be replaced. Refuses destinations inside `*.scene` folders (deleted by the next save) and existing files that are not heightmaps
 * exported before (no sidecar: textures and other assets are never replaced).
 */
export async function exportTerrainHeightmapEndpoint(scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const target = resolveTerrainMcpTarget(scene, data, options);

	const path = readTerrainMcpString(data, "path") ?? throwTerrainMcpInvalidArgument("path", "a destination path inside the project folder");
	const format = readTerrainMcpEnum(data, "format", ["png16", "raw16"] as const);

	requireTerrainMcpProjectDirectory();

	let absolutePath = resolveTerrainMcpPath(path);

	const extension = extname(absolutePath).toLowerCase();
	const extensionFormat = TERRAIN_MCP_HEIGHTMAP_EXPORT_EXTENSIONS[extension] ?? null;
	if (format && extensionFormat && format !== extensionFormat) {
		throw new Error(getTerrainMcpExportFormatMessage(format, extension));
	}

	const resolvedFormat = format ?? extensionFormat ?? "png16";
	if (!extensionFormat) {
		absolutePath += resolvedFormat === "raw16" ? ".r16" : ".png";
	}

	const relativePath = getTerrainMcpProjectRelativePath(absolutePath);
	if (!relativePath) {
		throw new Error(TERRAIN_MCP_OUTSIDE_PROJECT_MESSAGE);
	}

	if (isTerrainMcpPathInSceneFolder(relativePath)) {
		throw new Error(TERRAIN_MCP_SCENE_FOLDER_MESSAGE);
	}

	// Re-exporting over a heightmap exported before (it has its sidecar) is allowed.
	if ((await pathExists(absolutePath)) && !(await pathExists(getTerrainHeightmapSidecarPath(absolutePath)))) {
		throw new Error(getTerrainMcpExportOverwriteMessage(relativePath));
	}

	const result = await exportTerrainHeightmap(target.mesh, absolutePath, resolvedFormat);

	refreshTerrainMcpAssets(target.editor);

	return {
		path: relativePath,
		sidecar: `${relativePath}.heightmap.json`,
		minHeight: roundTerrainMcpValue(result.minWorld),
		maxHeight: roundTerrainMcpValue(result.maxWorld),
	};
}

// sample_terrain

/**
 * sample_terrain: height, normal, slope, hole flag and dominant painted layer of the rendered surface under world points (§8.1 rule 10);
 * `y` is null outside the terrain. Waits up to 30 s for weights that are still loading.
 */
export async function sampleTerrain(scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const target = resolveTerrainMcpTarget(scene, data, options);
	const points = readTerrainMcpPoints(data);
	const layerWeights = readTerrainMcpBoolean(data, "layerWeights") ?? false;

	await waitForTerrainMcpWeightsAsync(target);

	const layers = getTerrainPlugin(target.mesh)?.data.layers ?? [];

	const samples = points.map(([x, z]) => {
		const surface = sampleTerrainSurface(target.mesh, x, z);
		if (!surface) {
			return { x, z, y: null, normal: null, slopeDegrees: null, hole: false, dominantLayer: null };
		}

		const weights = layers.length ? sampleTerrainLayerWeights(target.mesh, x, z) : null;

		let dominant = -1;
		if (weights) {
			for (let index = 0; index < weights.length; ++index) {
				if (dominant === -1 || weights[index] > weights[dominant]) {
					dominant = index;
				}
			}
		}

		const normal = surface.normalWorld;

		return {
			x,
			z,
			y: roundTerrainMcpValue(surface.heightWorld),
			normal: [roundTerrainMcpValue(normal.x, 4), roundTerrainMcpValue(normal.y, 4), roundTerrainMcpValue(normal.z, 4)],
			slopeDegrees: roundTerrainMcpValue(surface.slopeDegrees),
			hole: surface.hole,
			dominantLayer: dominant === -1 ? null : (layers[dominant]?.name ?? null),
			...(layerWeights && weights ? { layerWeights: weights.map((weight) => roundTerrainMcpValue(weight, 3)) } : {}),
		};
	});

	return { samples };
}

// snap_nodes_to_terrain

/**
 * Local transform of a node stored by the undo entry of snap_nodes_to_terrain.
 */
interface ITerrainMcpNodeTransform {
	position: Vector3;
	rotation: Vector3;
	rotationQuaternion: Quaternion | null;
}

function captureTerrainMcpNodeTransform(node: TransformNode): ITerrainMcpNodeTransform {
	return {
		position: node.position.clone(),
		rotation: node.rotation.clone(),
		rotationQuaternion: node.rotationQuaternion?.clone() ?? null,
	};
}

function applyTerrainMcpNodeTransform(node: TransformNode, transform: ITerrainMcpNodeTransform): void {
	if (node.isDisposed()) {
		return;
	}

	node.rotationQuaternion = transform.rotationQuaternion?.clone() ?? null;
	node.rotation.copyFrom(transform.rotation);
	node.position.copyFrom(transform.position);
	computeTerrainMcpWorldMatrices(node);
}

/**
 * Returns the world bounds of the meshes with geometry of a node's hierarchy (the node included), or its absolute position when there is none.
 * @param node defines the node.
 */
export function getTerrainMcpNodeWorldBounds(node: TransformNode): { min: Vector3; max: Vector3 } {
	computeTerrainMcpWorldMatrices(node);

	const min = new Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
	const max = new Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);

	let found = false;
	for (const candidate of [node as Node, ...node.getDescendants(false)]) {
		if (!isAbstractMesh(candidate) || candidate.isDisposed() || !candidate.getTotalVertices()) {
			continue;
		}

		candidate.computeWorldMatrix(true);

		const box = candidate.getBoundingInfo().boundingBox;
		min.minimizeInPlace(box.minimumWorld);
		max.maximizeInPlace(box.maximumWorld);
		found = true;
	}

	if (!found) {
		const position = node.getAbsolutePosition();
		return { min: position.clone(), max: position.clone() };
	}

	return { min, max };
}

/**
 * Tilts a node so its up axis follows the given world normal: the shortest-arc rotation from the node's CURRENT world up axis to the normal
 * is composed before its current rotation (in world space), so snapping a node again (or an instance of an aligned node) changes nothing
 * and a re-sculpted slope gives the new normal; rotationQuaternion is created when absent (§8.1 rule 10).
 * @param node defines the node to tilt.
 * @param normal defines the world normal of the surface.
 */
export function alignTerrainMcpNodeToNormal(node: TransformNode, normal: Vector3): void {
	computeTerrainMcpWorldMatrices(node);

	const up = Vector3.TransformNormal(Vector3.Up(), node.getWorldMatrix());
	if (!(up.lengthSquared() > 1e-12)) {
		return;
	}

	up.normalize();

	const target = normal.normalizeToNew();

	const angle = Math.acos(Math.min(1, Math.max(-1, Vector3.Dot(up, target))));
	if (!(angle > 1e-6)) {
		return;
	}

	// Up opposite to the normal (upside-down node): any axis perpendicular to up turns it over.
	let axis = Vector3.Cross(up, target);
	if (axis.lengthSquared() < 1e-12) {
		axis = Vector3.Cross(up, Math.abs(up.x) < 0.9 ? Vector3.Right() : Vector3.Forward());
	}

	node.rotate(axis.normalize(), angle, Space.WORLD);
}

/**
 * snap_nodes_to_terrain: moves nodes vertically onto the terrain surface (optionally tilted to the slope), in one undo entry storing their
 * previous and new transforms. Nodes outside the terrain or over a hole are skipped (§8.1 rule 10).
 */
export async function snapNodesToTerrain(scene: Scene, data: any, options: IMCPActionOptions): Promise<any> {
	const target = resolveTerrainMcpTarget(scene, data, options);

	const nodeIds = isTerrainMcpObject(data) ? data.nodeIds : undefined;
	if (!Array.isArray(nodeIds) || nodeIds.length < 1 || nodeIds.length > 1000 || nodeIds.some((id) => typeof id !== "string" || !id)) {
		throwTerrainMcpInvalidArgument("nodeIds", "an array of 1 to 1000 node ids");
	}

	const alignToNormal = readTerrainMcpBoolean(data, "alignToNormal") ?? false;
	const offset = readTerrainMcpNumber(data, "offset") ?? 0;
	const anchor = readTerrainMcpEnum(data, "anchor", ["bottom", "origin"] as const) ?? "bottom";

	return runTerrainMcpMutationAsync(target, async () => {
		const snapped: { id: string; position: [number, number, number] }[] = [];
		const skipped: { id: string; reason: string }[] = [];
		const changes: { node: TransformNode; before: ITerrainMcpNodeTransform; after: ITerrainMcpNodeTransform }[] = [];

		for (const id of new Set<string>(nodeIds as string[])) {
			let node: Node | null = null;
			try {
				node = resolveNode({ scene, nodeId: id, nodeName: id });
			} catch (e) {
				node = null;
			}

			if (!node) {
				skipped.push({ id, reason: "not found" });
				continue;
			}

			if (!isAbstractMesh(node) && !isAnyTransformNode(node)) {
				skipped.push({ id, reason: "not a transform node" });
				continue;
			}

			const transformNode = node as TransformNode;

			if (transformNode === target.mesh) {
				skipped.push({ id, reason: "the terrain itself" });
				continue;
			}

			if (target.mesh.isDescendantOf(transformNode)) {
				skipped.push({ id, reason: "contains the terrain" });
				continue;
			}

			computeTerrainMcpWorldMatrices(transformNode);
			const absolute = transformNode.getAbsolutePosition().clone();

			let point = absolute;
			if (anchor === "bottom") {
				const bounds = getTerrainMcpNodeWorldBounds(transformNode);
				point = Vector3.Center(bounds.min, bounds.max);
			}

			const surface = sampleTerrainSurface(target.mesh, point.x, point.z);
			if (!surface) {
				skipped.push({ id, reason: "outside the terrain" });
				continue;
			}

			if (surface.hole) {
				skipped.push({ id, reason: "over a hole" });
				continue;
			}

			const before = captureTerrainMcpNodeTransform(transformNode);

			if (alignToNormal) {
				alignTerrainMcpNodeToNormal(transformNode, surface.normalWorld);
				computeTerrainMcpWorldMatrices(transformNode);
			}

			let y = surface.heightWorld + offset;
			if (anchor === "bottom") {
				const bottom = getTerrainMcpNodeWorldBounds(transformNode).min.y;
				y += transformNode.getAbsolutePosition().y - bottom;
			}

			transformNode.setAbsolutePosition(new Vector3(absolute.x, y, absolute.z));
			computeTerrainMcpWorldMatrices(transformNode);

			changes.push({ node: transformNode, before, after: captureTerrainMcpNodeTransform(transformNode) });

			const position = transformNode.getAbsolutePosition();
			snapped.push({
				id: transformNode.id,
				position: [roundTerrainMcpValue(position.x), roundTerrainMcpValue(position.y), roundTerrainMcpValue(position.z)],
			});
		}

		if (changes.length) {
			registerUndoRedo({
				executeRedo: false,
				undo: () => changes.forEach((change) => applyTerrainMcpNodeTransform(change.node, change.before)),
				redo: () => changes.forEach((change) => applyTerrainMcpNodeTransform(change.node, change.after)),
			});
		}

		return { snapped, skipped };
	});
}
