import type { ITerrainBrushShape, ITerrainGrid, ITerrainMetric, ITerrainStrokeRequest, ITerrainToolSettings, TerrainPaintTool, TerrainSculptTool, TerrainTool } from "./types";

/** Sculpt tools in the order of §1.6 (keys 1…9, 0). */
export const TERRAIN_SCULPT_TOOLS: readonly TerrainSculptTool[] = ["raise", "smooth", "flatten", "set-height", "ramp", "noise", "terrace", "erode", "stamp", "holes"];

/** Paint tools in the order of §1.10 (keys 1…3). */
export const TERRAIN_PAINT_TOOLS: readonly TerrainPaintTool[] = ["paint", "blend", "replace"];

/** Default strength per tool (§1.6; paint tools 50 %). */
const TERRAIN_DEFAULT_STRENGTH: Readonly<Record<TerrainTool, number>> = {
	raise: 0.35,
	smooth: 0.5,
	flatten: 0.5,
	"set-height": 0.5,
	ramp: 1,
	noise: 0.25,
	terrace: 0.5,
	erode: 0.5,
	stamp: 1,
	holes: 1,
	paint: 0.5,
	blend: 0.5,
	replace: 0.5,
};

/**
 * Tools without airbrush ("–" in §1.6: single application or binary result). Their airbrush flag is always false; every other tool
 * (continuous effect) defaults to on.
 */
const TERRAIN_NO_AIRBRUSH_TOOLS: readonly TerrainTool[] = ["ramp", "stamp", "holes"];

/** Defaults of §1.6–§1.11 and §1.12 (view). Every call returns a new object. */
export function createDefaultTerrainToolSettings(): ITerrainToolSettings {
	const strength = {} as Record<TerrainTool, number>;
	const airbrush = {} as Record<TerrainTool, boolean>;
	for (const tool of getTerrainTools()) {
		strength[tool] = TERRAIN_DEFAULT_STRENGTH[tool];
		airbrush[tool] = !TERRAIN_NO_AIRBRUSH_TOOLS.includes(tool);
	}

	return {
		version: 1,
		category: "sculpt",
		sculptTool: "raise",
		paintTool: "paint",
		invertToggle: false,
		brush: {
			brushId: "builtin:round",
			radius: 150,
			hardness: 0.3,
			falloff: "smooth",
			spacing: 0.15,
			rotation: 0,
			followStroke: false,
			positionJitter: 0,
			rotationJitter: 0,
			sizeJitter: 0,
			strengthJitter: 0,
			smoothing: 0,
			symmetry: "none",
			edgeFalloff: false,
			applyBrushDefaults: true,
		},
		strength,
		airbrush,
		sculpt: {
			smoothKernel: 0,
			flatten: { target: "stroke-start", heightWorld: 0, mode: "both" },
			setHeight: { heightWorld: 0, mode: "both" },
			ramp: { sideFalloff: 0.3, mode: "both", endHeights: "terrain", startWorld: 0, endWorld: 0 },
			noise: { type: "fbm", scale: 500, amplitude: 50, octaves: 4, persistence: 0.5, lacunarity: 2, seed: 1, mode: "bipolar" },
			terrace: { step: 100, sharpness: 0.8, offset: 0 },
			erode: {
				type: "thermal",
				talusDegrees: 35,
				iterations: 3,
				droplets: 64,
				lifetime: 30,
				inertia: 0.05,
				capacity: 4,
				erosion: 0.3,
				deposition: 0.3,
				evaporation: 0.01,
				gravity: 4,
			},
			stamp: { heightWorld: 200, blend: "add", onClickOnly: true },
			holes: { threshold: 0.5 },
			heightClamp: { enabled: false, minWorld: 0, maxWorld: 10000 },
		},
		paint: {
			opacity: 1,
			blendKernel: 2,
			replaceFromLayerId: null,
			replaceThreshold: 0.2,
		},
		filters: {
			height: { enabled: false, min: 0, max: 1000, feather: 50, invert: false },
			slope: { enabled: false, min: 0, max: 30, feather: 5, invert: false },
			layer: { enabled: false, layerId: null, threshold: 0.5, invert: false },
		},
		view: {
			overlay: "none",
			overlayOpacity: 0.6,
			contourInterval: 100,
			collapsed: { filters: true },
		},
	};
}

/** sculptTool in "sculpt", paintTool in "paint". */
export function getActiveTerrainTool(settings: ITerrainToolSettings): TerrainTool {
	return settings.category === "paint" ? settings.paintTool : settings.sculptTool;
}

/**
 * Builds the request of one stroke from the settings (UI) or from the defaults overridden by arguments (MCP).
 * - tool: the active tool; strength and airbrush: the values of that tool (airbrush always off for ramp, stamp and holes);
 * - brush, sculpt, paint and filters are deep copies: later settings changes never alter a running stroke;
 * - invert: the effective inversion at the start of the stroke (sticky toggle XOR Shift in the UI; the tool mapping for MCP,
 *   e.g. lower → raise + invert), stored as is (the stroke engine combines it with the per-sample flags, see TerrainStrokeEngine);
 * - layerId: kept for paint tools (the painted layer), null for sculpt tools;
 * - seed: kept when finite (non-finite → 0).
 */
export function buildTerrainStrokeRequest(settings: ITerrainToolSettings, shape: ITerrainBrushShape, layerId: string | null, invert: boolean, seed: number): ITerrainStrokeRequest {
	const tool = getActiveTerrainTool(settings);
	const isPaintTool = (TERRAIN_PAINT_TOOLS as readonly string[]).includes(tool);

	return {
		tool,
		invert,
		shape,
		brush: cloneJson(settings.brush),
		strength: settings.strength[tool] ?? TERRAIN_DEFAULT_STRENGTH[tool],
		airbrush: !TERRAIN_NO_AIRBRUSH_TOOLS.includes(tool) && settings.airbrush[tool] === true,
		sculpt: cloneJson(settings.sculpt),
		paint: cloneJson(settings.paint),
		filters: cloneJson(settings.filters),
		layerId: isPaintTool ? layerId : null,
		seed: Number.isFinite(seed) ? seed : 0,
	};
}

/**
 * Default resolution of a new or resampled terrain (§4.17), shared by the New terrain panel, the resolution fix and MCP create_terrain.
 * width/height in local cm; current = the terrain's S when known: kept when it is a power of two in [128, 1024], else
 * clamp(2^round(log2(max(W, H) / 40)), 64, 512).
 */
export function getDefaultTerrainSubdivisions(width: number, height: number, current?: number): number {
	if (current !== undefined && Number.isInteger(current) && current >= 128 && current <= 1024 && (current & (current - 1)) === 0) {
		return current;
	}

	const size = Math.max(width, height);
	if (!(size > 0)) {
		return 64;
	}

	const exponent = Math.round(Math.log2(size / 40));
	return Math.min(512, Math.max(64, Math.pow(2, exponent)));
}

/**
 * Radius range of the Brush section and the clamp applied when the target changes (§4.17), world cm:
 * cell = min(cellX sx, cellZ sz); min = 1.5 cell, max = half the world diagonal, step = max(0.01, cell / 4);
 * targetMin = 2 cell, targetMax = half the largest world side.
 */
export function getTerrainBrushRadiusRange(grid: ITerrainGrid, metric: ITerrainMetric): { min: number; max: number; step: number; targetMin: number; targetMax: number } {
	const cell = Math.min(grid.cellX * metric.sx, grid.cellZ * metric.sz);
	const worldWidth = grid.width * metric.sx;
	const worldHeight = grid.height * metric.sz;

	return {
		min: 1.5 * cell,
		max: 0.5 * Math.sqrt(worldWidth * worldWidth + worldHeight * worldHeight),
		step: Math.max(0.01, cell / 4),
		targetMin: 2 * cell,
		targetMax: 0.5 * Math.max(worldWidth, worldHeight),
	};
}

function getTerrainTools(): TerrainTool[] {
	return [...TERRAIN_SCULPT_TOOLS, ...TERRAIN_PAINT_TOOLS];
}

/** Deep copy of plain settings objects (numbers, strings, booleans, null, nested objects). */
function cloneJson<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}
