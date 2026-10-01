/** Inclusive integer rectangle; empty when x1 < x0 || y1 < y0. Vertices: x = column, y = row. Quads: quad column/row. Texels: texture order. */
export interface ITerrainRect {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}

export type TerrainResourceKind = "heights" | "holes" | "weights0" | "weights1";
export type TerrainRectsByKind = Partial<Record<TerrainResourceKind, ITerrainRect>>;

/** Square vertex grid of a terrain (§4.1). */
export interface ITerrainGrid {
	/** S (quads per side). */
	readonly subdivisions: number;
	/** S + 1. */
	readonly columns: number;
	/** S + 1. */
	readonly rows: number;
	/** W: local size along X (cm). */
	readonly width: number;
	/** H: local size along Z (cm). */
	readonly height: number;
	readonly cellX: number;
	readonly cellZ: number;
	/** `${S}:${W}:${H}` */
	readonly signature: string;
	vertexIndex(col: number, row: number): number;
	localX(col: number): number;
	localZ(row: number): number;
	colOf(x: number): number;
	rowOf(z: number): number;
}

/**
 * World length (cm) of the ground's local unit axes, read from Babylon's row-vector world matrix m (Matrix.m, as Matrix.decompose does):
 * sx = |(m[0], m[1], m[2])|, sy = |(m[4], m[5], m[6])|, sz = |(m[8], m[9], m[10])| (§4.1). A component < 1e-6 makes the terrain ineligible (degenerate-transform).
 */
export interface ITerrainMetric {
	readonly sx: number;
	readonly sy: number;
	readonly sz: number;
}

/** Ray in ground-local space; direction NOT normalized so t equals the world ray parameter. */
export interface ITerrainLocalRay {
	ox: number;
	oy: number;
	oz: number;
	dx: number;
	dy: number;
	dz: number;
}

export interface ITerrainRayHit {
	t: number;
	x: number;
	y: number;
	z: number;
	col: number;
	row: number;
	quadCol: number;
	quadRow: number;
	/** Local geometric normal of the hit triangle (normalized). */
	nx: number;
	ny: number;
	nz: number;
}

/** Logical weights: RGBA maps in texture order, layer l in maps[l >> 2] channel l & 3, 8 weights sum to 255. maps[1] null when layerCount <= 4. */
export interface ITerrainWeightMaps {
	readonly size: number;
	layerCount: number;
	readonly maps: [Uint8Array, Uint8Array | null];
}

/** Image in IMAGE ORDER (row 0 = top = local +Z edge, column 0 = local -X edge), values 0..1. */
export interface ITerrainImage {
	width: number;
	height: number;
	data: Float32Array;
}

/** RGBA8 image in IMAGE ORDER (splat maps): channel c of the pixel = weight of layer 4k + c for the k-th splat map. */
export interface ITerrainRgbaImage {
	width: number;
	height: number;
	/** width * height * 4 bytes. */
	data: Uint8Array;
}

/** Brush mask 0..1: row 0 = image top = brush +Z at rotation 0, column 0 = brush -X. */
export interface ITerrainBrushMask {
	readonly width: number;
	readonly height: number;
	readonly data: Float32Array;
}

export type TerrainFalloff = "smooth" | "linear" | "spherical" | "sharp" | "constant" | "gaussian";

export interface ITerrainBrushShape {
	id: string;
	kind: "round" | "square" | "image";
	/** Required when kind === "image". */
	mask: ITerrainBrushMask | null;
	falloff: TerrainFalloff;
	/** 0..0.95. */
	hardness: number;
	/** Image brushes: multiply the mask by the round falloff. */
	edgeFalloff: boolean;
}

export type TerrainCategory = "sculpt" | "paint" | "settings";
export type TerrainSculptTool = "raise" | "smooth" | "flatten" | "set-height" | "ramp" | "noise" | "terrace" | "erode" | "stamp" | "holes";
export type TerrainPaintTool = "paint" | "blend" | "replace" | "auto-paint";
export type TerrainTool = TerrainSculptTool | TerrainPaintTool;
export type TerrainSymmetry = "none" | "x" | "z" | "xz";
export type TerrainOverlay = "none" | "layer-weights" | "active-layer" | "contours" | "slope" | "grid";
export type TerrainBandMode = "both" | "raise" | "lower";

export interface ITerrainBrushSettings {
	brushId: string;
	/** World cm. */
	radius: number;
	/** 0..0.95. */
	hardness: number;
	falloff: TerrainFalloff;
	/** Fraction of the diameter, 0.02..2. */
	spacing: number;
	/** Degrees. */
	rotation: number;
	followStroke: boolean;
	/** Fraction of the radius, 0..1. */
	positionJitter: number;
	/** Degrees, 0..180. */
	rotationJitter: number;
	/** 0..1. */
	sizeJitter: number;
	/** 0..1. */
	strengthJitter: number;
	/** Lazy mouse, 0..0.95. */
	smoothing: number;
	symmetry: TerrainSymmetry;
	pressureSize: boolean;
	/** 0..1 (fraction of the radius at zero pressure). */
	pressureSizeMin: number;
	pressureStrength: boolean;
	edgeFalloff: boolean;
	applyBrushDefaults: boolean;
}

export interface ITerrainSculptOptions {
	/** 0 = auto, else 1..16 cells. */
	smoothKernel: number;
	flatten: { target: "stroke-start" | "fixed" | "slope"; heightWorld: number; mode: TerrainBandMode };
	setHeight: { heightWorld: number; mode: TerrainBandMode };
	ramp: { sideFalloff: number; mode: TerrainBandMode; endHeights: "terrain" | "custom"; startWorld: number; endWorld: number };
	noise: {
		type: "fbm" | "ridged" | "billow";
		scale: number;
		amplitude: number;
		octaves: number;
		persistence: number;
		lacunarity: number;
		seed: number;
		mode: "bipolar" | "raise";
	};
	terrace: { step: number; sharpness: number; offset: number };
	erode: {
		type: "thermal" | "hydraulic";
		talusDegrees: number;
		iterations: number;
		droplets: number;
		lifetime: number;
		inertia: number;
		capacity: number;
		erosion: number;
		deposition: number;
		evaporation: number;
		gravity: number;
	};
	stamp: { heightWorld: number; blend: "add" | "max" | "min" | "replace"; onClickOnly: boolean };
	holes: { threshold: number };
	heightClamp: { enabled: boolean; minWorld: number; maxWorld: number };
}

export interface ITerrainPaintOptions {
	/** 0..1: maximum coverage one stroke can reach. */
	opacity: number;
	/** Texels, 1..8. */
	blendKernel: number;
	replaceFromLayerId: string | null;
	/** 0..1. */
	replaceThreshold: number;
}

export interface ITerrainFilterBand {
	enabled: boolean;
	min: number;
	max: number;
	feather: number;
	invert: boolean;
}

export interface ITerrainFilterSettings {
	/** World cm. */
	height: ITerrainFilterBand;
	/** Degrees. */
	slope: ITerrainFilterBand;
	layer: { enabled: boolean; layerId: string | null; threshold: number; invert: boolean };
}

export interface ITerrainAutoPaintRule {
	layerId: string;
	enabled: boolean;
	height: { minWorld: number; maxWorld: number; featherWorld: number } | null;
	slope: { minDegrees: number; maxDegrees: number; featherDegrees: number } | null;
	noise: { scale: number; amount: number; seed: number } | null;
	/** 0..1. */
	opacity: number;
}

export interface ITerrainResolvedAutoPaintRule extends Omit<ITerrainAutoPaintRule, "layerId"> {
	layerIndex: number;
}

export interface ITerrainViewSettings {
	overlay: TerrainOverlay;
	overlayOpacity: number;
	/** World cm. */
	contourInterval: number;
	showFootprint: boolean;
	showHud: boolean;
	hideGizmo: boolean;
	hideSceneIcons: boolean;
	autoReprojectDecals: boolean;
	/** Default false: the target terrain is picked first, other grounds (water planes, roads) never block the brush (§1.15). */
	otherGroundsBlockBrush: boolean;
	/** Collapsed state of sections/blocks by id; default { filters: true }. */
	collapsed: Record<string, boolean>;
}

export interface ITerrainToolSettings {
	version: 1;
	category: TerrainCategory;
	sculptTool: TerrainSculptTool;
	paintTool: TerrainPaintTool;
	invertToggle: boolean;
	brush: ITerrainBrushSettings;
	strength: Record<TerrainTool, number>;
	airbrush: Record<TerrainTool, boolean>;
	sculpt: ITerrainSculptOptions;
	paint: ITerrainPaintOptions;
	filters: ITerrainFilterSettings;
	view: ITerrainViewSettings;
}

/** One stroke, built by the UI from ITerrainToolSettings (buildTerrainStrokeRequest) or by MCP. */
export interface ITerrainStrokeRequest {
	tool: TerrainTool;
	invert: boolean;
	shape: ITerrainBrushShape;
	brush: ITerrainBrushSettings;
	/** 0..1 for this tool. */
	strength: number;
	airbrush: boolean;
	sculpt: ITerrainSculptOptions;
	paint: ITerrainPaintOptions;
	filters: ITerrainFilterSettings;
	/** Paint tools: layer painted (resolved to an index by the engine). */
	layerId: string | null;
	seed: number;
}

/** Pointer sample in METRIC-LOCAL space (local x/z multiplied by metric sx/sz). */
export interface ITerrainStrokeSample {
	mx: number;
	mz: number;
	/** 0..1; mice report 1 (the engine replaces 0.5 mouse pressure by 1). */
	pressure: number;
	pointerType: "mouse" | "pen" | "touch";
	timeMs: number;
	invert: boolean;
}

export interface ITerrainDab {
	index: number;
	mx: number;
	mz: number;
	/** World cm, after pressure and jitter. */
	radius: number;
	/** Radians, in the metric-local XZ plane. */
	rotation: number;
	/** 0..1, after pressure and jitter. */
	strength: number;
	/** Spacing/time normalization (§4.3). */
	amountScale: number;
	invert: boolean;
	seed: number;
	mirrored: boolean;
}

/** Dab weights over a rect of a resource space: weights[(j - rect.y0) * stride + (i - rect.x0)] in 0..1. */
export interface ITerrainDabWeights {
	rect: ITerrainRect;
	stride: number;
	weights: Float32Array;
}

export interface ITerrainTileResource {
	readonly kind: TerrainResourceKind;
	/** Elements per row: vertices (S+1), quads (S), texels (size). */
	readonly width: number;
	readonly height: number;
	readonly channels: 1 | 4;
	readonly data: Float32Array | Uint8Array;
}

export type TerrainTileResourceProvider = (kind: TerrainResourceKind) => ITerrainTileResource | null;

export interface ITerrainUndoPayload {
	readonly byteLength: number;
	readonly signature: string;
	readonly released: boolean;
	/** Exchanges stored and live data (undo === redo). No-op returning {} when released or when signature differs (tile payloads). */
	swap(provider: TerrainTileResourceProvider, signature: string): TerrainRectsByKind;
	release(): void;
}

export interface ITerrainSurfaceSampler {
	/** World height (cm) at a local point. */
	heightWorldAt(x: number, z: number): number;
	/** Slope in degrees (0 = flat) at a local point, in world units. */
	slopeDegreesAt(x: number, z: number): number;
}

export interface ITerrainStrokeTarget {
	readonly grid: ITerrainGrid;
	readonly metric: ITerrainMetric;
	/** (S+1)² local heights, row 0 = +Z edge. */
	readonly heights: Float32Array;
	/** S² quads, 1 = hole. */
	readonly holes: Uint8Array;
	readonly weights: ITerrainWeightMaps | null;
	readonly surface: ITerrainSurfaceSampler;
	worldToLocalHeight(worldY: number): number;
	localToWorldHeight(localY: number): number;
	markDirty(kind: TerrainResourceKind, rect: ITerrainRect): void;
}

export interface ITerrainStrokeConfig {
	request: ITerrainStrokeRequest;
	/** Index of request.layerId, -1 when not painting. */
	layerIndex: number;
	/** Index of paint.replaceFromLayerId, -1 when unused. */
	replaceFromLayerIndex: number;
	/** Index of filters.layer.layerId, -1 when unused. */
	filterLayerIndex: number;
	autoPaintRules: ITerrainResolvedAutoPaintRule[];
	/** Tiles provider for the undo journal. */
	provider: TerrainTileResourceProvider;
}

export interface ITerrainStrokePreview {
	/** Local coordinates (x, z) and local height y. */
	rampStart: { x: number; y: number; z: number } | null;
	rampEnd: { x: number; y: number; z: number } | null;
	targetLocalHeight: number | null;
	lazyCenter: { mx: number; mz: number } | null;
}
