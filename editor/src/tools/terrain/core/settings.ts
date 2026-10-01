import type {
	ITerrainBrushSettings,
	ITerrainBrushShape,
	ITerrainFilterBand,
	ITerrainFilterSettings,
	ITerrainGrid,
	ITerrainMetric,
	ITerrainPaintOptions,
	ITerrainSculptOptions,
	ITerrainStrokeRequest,
	ITerrainToolSettings,
	ITerrainViewSettings,
	TerrainBandMode,
	TerrainCategory,
	TerrainFalloff,
	TerrainOverlay,
	TerrainPaintTool,
	TerrainSculptTool,
	TerrainSymmetry,
	TerrainTool,
} from "./types";

/** Sculpt tools in the order of §1.6 (keys 1…9, 0). */
export const TERRAIN_SCULPT_TOOLS: readonly TerrainSculptTool[] = ["raise", "smooth", "flatten", "set-height", "ramp", "noise", "terrace", "erode", "stamp", "holes"];

/** Paint tools in the order of §1.10 (keys 1…4). */
export const TERRAIN_PAINT_TOOLS: readonly TerrainPaintTool[] = ["paint", "blend", "replace", "auto-paint"];

const TERRAIN_CATEGORIES: readonly TerrainCategory[] = ["sculpt", "paint", "settings"];
const TERRAIN_FALLOFFS: readonly TerrainFalloff[] = ["smooth", "linear", "spherical", "sharp", "constant", "gaussian"];
const TERRAIN_SYMMETRIES: readonly TerrainSymmetry[] = ["none", "x", "z", "xz"];
const TERRAIN_OVERLAYS: readonly TerrainOverlay[] = ["none", "layer-weights", "active-layer", "contours", "slope", "grid"];
const TERRAIN_BAND_MODES: readonly TerrainBandMode[] = ["both", "raise", "lower"];

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
	"auto-paint": 0.5,
};

/**
 * Tools without airbrush ("–" in §1.6: single application or binary result). Their airbrush flag is always false; every other tool
 * (continuous effect) defaults to on.
 */
const TERRAIN_NO_AIRBRUSH_TOOLS: readonly TerrainTool[] = ["ramp", "stamp", "holes"];

/** Largest world length accepted by the settings (1000 km): anything beyond comes from corrupted data. */
const TERRAIN_MAX_WORLD_LENGTH = 1e8;

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
			pressureSize: false,
			pressureSizeMin: 0.2,
			pressureStrength: true,
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
			showFootprint: true,
			showHud: true,
			hideGizmo: true,
			hideSceneIcons: true,
			autoReprojectDecals: true,
			otherGroundsBlockBrush: false,
			collapsed: { filters: true },
		},
	};
}

/**
 * Tolerant merge of persisted JSON over the defaults: unknown keys dropped, invalid values (wrong type, unknown enum value, non-finite
 * number) replaced by the default, numbers clamped to the ranges of the fields (§1.6–§1.12; the widest of the UI and MCP ranges).
 * Never throws; always returns a new, complete object.
 */
export function mergeTerrainToolSettings(value: unknown): ITerrainToolSettings {
	const defaults = createDefaultTerrainToolSettings();
	const source = asRecord(value);

	const strengthSource = asRecord(source.strength);
	const airbrushSource = asRecord(source.airbrush);
	for (const tool of getTerrainTools()) {
		defaults.strength[tool] = readNumber(strengthSource[tool], defaults.strength[tool], 0, 1);
		defaults.airbrush[tool] = TERRAIN_NO_AIRBRUSH_TOOLS.includes(tool) ? false : readBoolean(airbrushSource[tool], defaults.airbrush[tool]);
	}

	return {
		version: 1,
		category: readEnum(source.category, TERRAIN_CATEGORIES, defaults.category),
		sculptTool: readEnum(source.sculptTool, TERRAIN_SCULPT_TOOLS, defaults.sculptTool),
		paintTool: readEnum(source.paintTool, TERRAIN_PAINT_TOOLS, defaults.paintTool),
		invertToggle: readBoolean(source.invertToggle, defaults.invertToggle),
		brush: mergeBrushSettings(source.brush, defaults.brush),
		strength: defaults.strength,
		airbrush: defaults.airbrush,
		sculpt: mergeSculptOptions(source.sculpt, defaults.sculpt),
		paint: mergePaintOptions(source.paint, defaults.paint),
		filters: mergeFilterSettings(source.filters, defaults.filters),
		view: mergeViewSettings(source.view, defaults.view),
	};
}

/** sculptTool in "sculpt", paintTool in "paint", null in "settings" (no strokes there, §1.15). */
export function getActiveTerrainTool(settings: ITerrainToolSettings): TerrainTool | null {
	switch (settings.category) {
		case "sculpt":
			return settings.sculptTool;
		case "paint":
			return settings.paintTool;
		default:
			return null;
	}
}

/**
 * Builds the request of one stroke from the settings (UI) or from the defaults overridden by arguments (MCP). Throws when the category
 * is "settings" (callers check getActiveTerrainTool first).
 * - tool: the active tool; strength and airbrush: the values of that tool (airbrush always off for ramp, stamp and holes);
 * - brush, sculpt, paint and filters are deep copies: later settings changes never alter a running stroke;
 * - invert: the effective inversion at the start of the stroke (sticky toggle XOR Shift XOR pen eraser in the UI; the tool mapping for MCP,
 *   e.g. lower → raise + invert), stored as is (the stroke engine combines it with the per-sample flags, see TerrainStrokeEngine);
 * - layerId: kept for paint tools (the painted layer), null for sculpt tools;
 * - seed: kept when finite (non-finite → 0).
 */
export function buildTerrainStrokeRequest(settings: ITerrainToolSettings, shape: ITerrainBrushShape, layerId: string | null, invert: boolean, seed: number): ITerrainStrokeRequest {
	const tool = getActiveTerrainTool(settings);
	if (!tool) {
		throw new Error("terrain: buildTerrainStrokeRequest needs the sculpt or paint category (no strokes in the settings category)");
	}

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

function mergeBrushSettings(value: unknown, defaults: ITerrainBrushSettings): ITerrainBrushSettings {
	const source = asRecord(value);

	return {
		brushId: readNonEmptyString(source.brushId, defaults.brushId),
		radius: readNumber(source.radius, defaults.radius, 0.01, 100000),
		hardness: readNumber(source.hardness, defaults.hardness, 0, 0.95),
		falloff: readEnum(source.falloff, TERRAIN_FALLOFFS, defaults.falloff),
		spacing: readNumber(source.spacing, defaults.spacing, 0.02, 2),
		rotation: readNumber(source.rotation, defaults.rotation, -180, 180),
		followStroke: readBoolean(source.followStroke, defaults.followStroke),
		positionJitter: readNumber(source.positionJitter, defaults.positionJitter, 0, 1),
		rotationJitter: readNumber(source.rotationJitter, defaults.rotationJitter, 0, 180),
		sizeJitter: readNumber(source.sizeJitter, defaults.sizeJitter, 0, 1),
		strengthJitter: readNumber(source.strengthJitter, defaults.strengthJitter, 0, 1),
		smoothing: readNumber(source.smoothing, defaults.smoothing, 0, 0.95),
		symmetry: readEnum(source.symmetry, TERRAIN_SYMMETRIES, defaults.symmetry),
		pressureSize: readBoolean(source.pressureSize, defaults.pressureSize),
		pressureSizeMin: readNumber(source.pressureSizeMin, defaults.pressureSizeMin, 0, 1),
		pressureStrength: readBoolean(source.pressureStrength, defaults.pressureStrength),
		edgeFalloff: readBoolean(source.edgeFalloff, defaults.edgeFalloff),
		applyBrushDefaults: readBoolean(source.applyBrushDefaults, defaults.applyBrushDefaults),
	};
}

function mergeSculptOptions(value: unknown, defaults: ITerrainSculptOptions): ITerrainSculptOptions {
	const source = asRecord(value);
	const flatten = asRecord(source.flatten);
	const setHeight = asRecord(source.setHeight);
	const ramp = asRecord(source.ramp);
	const noise = asRecord(source.noise);
	const terrace = asRecord(source.terrace);
	const erode = asRecord(source.erode);
	const stamp = asRecord(source.stamp);
	const holes = asRecord(source.holes);
	const heightClamp = asRecord(source.heightClamp);

	return {
		smoothKernel: readInteger(source.smoothKernel, defaults.smoothKernel, 0, 16),
		flatten: {
			target: readEnum(flatten.target, ["stroke-start", "fixed", "slope"] as const, defaults.flatten.target),
			heightWorld: readWorldLength(flatten.heightWorld, defaults.flatten.heightWorld),
			mode: readEnum(flatten.mode, TERRAIN_BAND_MODES, defaults.flatten.mode),
		},
		setHeight: {
			heightWorld: readWorldLength(setHeight.heightWorld, defaults.setHeight.heightWorld),
			mode: readEnum(setHeight.mode, TERRAIN_BAND_MODES, defaults.setHeight.mode),
		},
		ramp: {
			sideFalloff: readNumber(ramp.sideFalloff, defaults.ramp.sideFalloff, 0, 1),
			mode: readEnum(ramp.mode, TERRAIN_BAND_MODES, defaults.ramp.mode),
			endHeights: readEnum(ramp.endHeights, ["terrain", "custom"] as const, defaults.ramp.endHeights),
			startWorld: readWorldLength(ramp.startWorld, defaults.ramp.startWorld),
			endWorld: readWorldLength(ramp.endWorld, defaults.ramp.endWorld),
		},
		noise: {
			type: readEnum(noise.type, ["fbm", "ridged", "billow"] as const, defaults.noise.type),
			scale: readNumber(noise.scale, defaults.noise.scale, 1, TERRAIN_MAX_WORLD_LENGTH),
			amplitude: readNumber(noise.amplitude, defaults.noise.amplitude, 0, TERRAIN_MAX_WORLD_LENGTH),
			octaves: readInteger(noise.octaves, defaults.noise.octaves, 1, 10),
			persistence: readNumber(noise.persistence, defaults.noise.persistence, 0, 1),
			lacunarity: readNumber(noise.lacunarity, defaults.noise.lacunarity, 1, 4),
			seed: readInteger(noise.seed, defaults.noise.seed, -2147483648, 2147483647),
			mode: readEnum(noise.mode, ["bipolar", "raise"] as const, defaults.noise.mode),
		},
		terrace: {
			step: readNumber(terrace.step, defaults.terrace.step, 0.01, TERRAIN_MAX_WORLD_LENGTH),
			sharpness: readNumber(terrace.sharpness, defaults.terrace.sharpness, 0, 1),
			offset: readWorldLength(terrace.offset, defaults.terrace.offset),
		},
		erode: {
			type: readEnum(erode.type, ["thermal", "hydraulic"] as const, defaults.erode.type),
			talusDegrees: readNumber(erode.talusDegrees, defaults.erode.talusDegrees, 0, 89),
			iterations: readInteger(erode.iterations, defaults.erode.iterations, 1, 50),
			droplets: readInteger(erode.droplets, defaults.erode.droplets, 1, 200000),
			lifetime: readInteger(erode.lifetime, defaults.erode.lifetime, 5, 100),
			inertia: readNumber(erode.inertia, defaults.erode.inertia, 0, 0.99),
			capacity: readNumber(erode.capacity, defaults.erode.capacity, 0.01, 64),
			erosion: readNumber(erode.erosion, defaults.erode.erosion, 0, 1),
			deposition: readNumber(erode.deposition, defaults.erode.deposition, 0, 1),
			evaporation: readNumber(erode.evaporation, defaults.erode.evaporation, 0, 1),
			gravity: readNumber(erode.gravity, defaults.erode.gravity, 0, 100),
		},
		stamp: {
			heightWorld: readWorldLength(stamp.heightWorld, defaults.stamp.heightWorld),
			blend: readEnum(stamp.blend, ["add", "max", "min", "replace"] as const, defaults.stamp.blend),
			onClickOnly: readBoolean(stamp.onClickOnly, defaults.stamp.onClickOnly),
		},
		holes: {
			threshold: readNumber(holes.threshold, defaults.holes.threshold, 0.05, 1),
		},
		heightClamp: {
			enabled: readBoolean(heightClamp.enabled, defaults.heightClamp.enabled),
			minWorld: readWorldLength(heightClamp.minWorld, defaults.heightClamp.minWorld),
			maxWorld: readWorldLength(heightClamp.maxWorld, defaults.heightClamp.maxWorld),
		},
	};
}

function mergePaintOptions(value: unknown, defaults: ITerrainPaintOptions): ITerrainPaintOptions {
	const source = asRecord(value);

	return {
		opacity: readNumber(source.opacity, defaults.opacity, 0, 1),
		blendKernel: readInteger(source.blendKernel, defaults.blendKernel, 1, 8),
		replaceFromLayerId: readNullableString(source.replaceFromLayerId, defaults.replaceFromLayerId),
		replaceThreshold: readNumber(source.replaceThreshold, defaults.replaceThreshold, 0, 1),
	};
}

function mergeFilterSettings(value: unknown, defaults: ITerrainFilterSettings): ITerrainFilterSettings {
	const source = asRecord(value);
	const layer = asRecord(source.layer);

	return {
		height: mergeFilterBand(source.height, defaults.height, -TERRAIN_MAX_WORLD_LENGTH, TERRAIN_MAX_WORLD_LENGTH, TERRAIN_MAX_WORLD_LENGTH),
		slope: mergeFilterBand(source.slope, defaults.slope, 0, 90, 90),
		layer: {
			enabled: readBoolean(layer.enabled, defaults.layer.enabled),
			layerId: readNullableString(layer.layerId, defaults.layer.layerId),
			threshold: readNumber(layer.threshold, defaults.layer.threshold, 0, 1),
			invert: readBoolean(layer.invert, defaults.layer.invert),
		},
	};
}

function mergeFilterBand(value: unknown, defaults: ITerrainFilterBand, min: number, max: number, maxFeather: number): ITerrainFilterBand {
	const source = asRecord(value);

	return {
		enabled: readBoolean(source.enabled, defaults.enabled),
		min: readNumber(source.min, defaults.min, min, max),
		max: readNumber(source.max, defaults.max, min, max),
		feather: readNumber(source.feather, defaults.feather, 0, maxFeather),
		invert: readBoolean(source.invert, defaults.invert),
	};
}

function mergeViewSettings(value: unknown, defaults: ITerrainViewSettings): ITerrainViewSettings {
	const source = asRecord(value);

	const collapsed: Record<string, boolean> = { ...defaults.collapsed };
	const collapsedSource = asRecord(source.collapsed);
	let count = 0;
	for (const key of Object.keys(collapsedSource)) {
		const entry = collapsedSource[key];
		if (typeof entry === "boolean" && key.length > 0 && key.length <= 128 && count < 256) {
			collapsed[key] = entry;
			++count;
		}
	}

	return {
		overlay: readEnum(source.overlay, TERRAIN_OVERLAYS, defaults.overlay),
		overlayOpacity: readNumber(source.overlayOpacity, defaults.overlayOpacity, 0, 1),
		contourInterval: readNumber(source.contourInterval, defaults.contourInterval, 1, TERRAIN_MAX_WORLD_LENGTH),
		showFootprint: readBoolean(source.showFootprint, defaults.showFootprint),
		showHud: readBoolean(source.showHud, defaults.showHud),
		hideGizmo: readBoolean(source.hideGizmo, defaults.hideGizmo),
		hideSceneIcons: readBoolean(source.hideSceneIcons, defaults.hideSceneIcons),
		autoReprojectDecals: readBoolean(source.autoReprojectDecals, defaults.autoReprojectDecals),
		otherGroundsBlockBrush: readBoolean(source.otherGroundsBlockBrush, defaults.otherGroundsBlockBrush),
		collapsed,
	};
}

function asRecord(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readNumber(value: unknown, fallback: number, min: number, max: number): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return fallback;
	}

	return Math.min(max, Math.max(min, value));
}

function readInteger(value: unknown, fallback: number, min: number, max: number): number {
	return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
}

function readWorldLength(value: unknown, fallback: number): number {
	return readNumber(value, fallback, -TERRAIN_MAX_WORLD_LENGTH, TERRAIN_MAX_WORLD_LENGTH);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function readEnum<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
	return typeof value === "string" && (values as readonly string[]).includes(value) ? (value as T) : fallback;
}

function readNonEmptyString(value: unknown, fallback: string): string {
	return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readNullableString(value: unknown, fallback: string | null): string | null {
	if (value === null) {
		return null;
	}

	return typeof value === "string" && value.length > 0 ? value : fallback;
}

/** Deep copy of plain settings objects (numbers, strings, booleans, null, nested objects). */
function cloneJson<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}
