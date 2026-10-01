import type { AbstractMesh, Material, Mesh, Node, Ray, Vector3 } from "babylonjs";
import type { ITerrainBudgetInfo, ITerrainLayerData, TerrainLoadState, TerrainMapChannel, TerrainMaterialPlugin, TerrainNormalConvention } from "babylonjs-editor-tools";

import type { ITerrainGenerateParams } from "../core/kernels/generate";
import type { ITerrainImage, TerrainTool } from "../core/types";

export type TerrainIneligibilityReason =
	| "not-a-mesh"
	| "not-a-terrain"
	| "instance"
	| "collision-proxy"
	| "lod-child"
	| "locked"
	| "scene-link"
	| "no-geometry"
	| "skeleton-or-morph"
	| "multiple-submeshes"
	| "degenerate-transform"
	| "invalid-grid";

export type TerrainWarning =
	| "shared-geometry"
	| "shared-material"
	| "has-instances"
	| "has-lods"
	| "tilted"
	| "collision-proxy"
	| "box-physics"
	| "newer-version"
	| "unsupported-resolution"
	| "hidden"
	| "no-terrain-material"
	| "material-unassigned"
	| "weights-error"
	| "layers-error";

/** Only terrains (TerrainMesh) are eligible. readOnly = warnings include "newer-version" or "unsupported-resolution". */
export type TerrainEligibility =
	| { eligible: true; mesh: Mesh; subdivisions: number; readOnly: boolean; warnings: TerrainWarning[] }
	| { eligible: false; reason: TerrainIneligibilityReason; message: string; mesh: AbstractMesh | null; fixTarget: Node | null };

export interface ITerrainListItem {
	mesh: Mesh;
	name: string;
	subdivisions: number;
}

export interface ITerrainLayerInfo {
	id: string;
	index: number;
	name: string;
	albedo: string | null;
	normal: string | null;
	tileSize: [number, number];
	coverage: number | null;
}

export interface ITerrainInfo {
	mesh: Mesh;
	id: string;
	name: string;
	readOnly: boolean;
	subdivisions: number;
	width: number;
	height: number;
	cellX: number;
	cellZ: number;
	/** World cm. */
	worldHeightRange: [number, number];
	holes: number;
	vertices: number;
	triangles: number;
	material: { id: string; name: string; isTerrainMaterial: boolean } | null;
	layers: ITerrainLayerInfo[];
	weightMapSize: number | null;
	layerTextureSize: number | null;
	weightMapsState: TerrainLoadState | null;
	layerTexturesState: TerrainLoadState | null;
	weightsDirty: boolean;
	budget: ITerrainBudgetInfo | null;
	memory: { cpuBytes: number; gpuBytes: number; geometryFileBytes: number };
	warnings: TerrainWarning[];
}

export interface ITerrainPickOptions {
	/** Only this mesh (target-first picking, §1.15). */
	mesh?: Mesh | null;
	/** Default true: only eligible terrains. Hidden or disabled meshes are never picked. */
	eligibleOnly?: boolean;
	/** Default false: hole quads are transparent to the ray. The Holes tool passes true. */
	solidHoles?: boolean;
}

export interface ITerrainPick {
	mesh: Mesh;
	worldPoint: Vector3;
	worldNormal: Vector3;
	localPoint: Vector3;
	distance: number;
	col: number;
	row: number;
}

export interface ITerrainSurfaceSample {
	heightWorld: number;
	normalWorld: Vector3;
	slopeDegrees: number;
	localPoint: Vector3;
	/** true when the point lies over a hole quad (heightWorld is still the interpolated surface). */
	hole: boolean;
}

export interface ITerrainPointerSample {
	ray: Ray;
	timeMs: number;
	invert: boolean;
}

export interface ITerrainStrokePreview {
	rampStart: Vector3 | null;
	rampEnd: Vector3 | null;
	targetHeightWorld: number | null;
	/** World point of the lazy-mouse brush centre (stroke smoothing > 0), null otherwise (§1.14). */
	lazyCenter: Vector3 | null;
}

export interface ITerrainStrokeHandle {
	readonly mesh: Mesh;
	readonly tool: TerrainTool;
	readonly isActive: boolean;
	readonly preview: Readonly<ITerrainStrokePreview>;
	addSample(sample: ITerrainPointerSample): void;
	/** Commits (registers one undo entry). */
	end(): void;
	/** Restores the before-state, no undo entry. */
	cancel(): void;
}

export type TerrainStrokeRefusal =
	| "not-eligible"
	| "read-only"
	| "unsupported-resolution"
	| "hidden"
	| "playing"
	| "saving"
	| "busy"
	| "shared-geometry"
	| "shared-material"
	| "no-material"
	| "no-layer"
	| "weights-loading"
	| "weights-error";

/** Texts of the stroke refusals (§1.17 `refused.*`): messages of TerrainRefusedError, hint line and HUD of the Terrain tab. */
export const TERRAIN_REFUSAL_MESSAGES: Readonly<Record<TerrainStrokeRefusal, string>> = {
	playing: "Terrain tools are disabled while the game is playing.",
	saving: "Saving…",
	busy: "A terrain operation is running: wait for it to finish.",
	"not-eligible": "Only terrains can be sculpted: select a terrain.",
	hidden: "This terrain is hidden: show it to edit it.",
	"shared-geometry": "This terrain shares its geometry: click “Make unique” first.",
	"shared-material": "This terrain shares its material: click “Make unique” first.",
	"no-material": "Enable texture painting in the Layers section first.",
	"no-layer": "Select a layer to paint.",
	"weights-loading": "Loading terrain weights…",
	"weights-error": "The painted layers couldn't be loaded: retry, locate or reset them first.",
	"read-only": "Created with a newer editor version: read-only.",
	"unsupported-resolution": "This terrain's resolution isn't supported: resample it first.",
};

/** Thrown by the asynchronous engine calls refused for the same reasons as strokes (busy, playing, saving, read-only, ...). message = the §1.17 text of the refusal. */
export class TerrainRefusedError extends Error {
	public readonly refusal: TerrainStrokeRefusal;

	public constructor(refusal: TerrainStrokeRefusal, message: string) {
		super(message);
		this.refusal = refusal;
	}
}

export interface ITerrainBeginStrokeResult {
	handle: ITerrainStrokeHandle | null;
	refusal: TerrainStrokeRefusal | null;
	/** Text of §1.17 for the refusal. */
	message: string | null;
}

export interface ITerrainApplyStrokeOptions {
	/** MCP: make shared geometry/material unique automatically (undoable) instead of refusing. */
	autoFixSharing?: boolean;
	/** Paint and layer-filtered strokes wait up to this long for the weight maps instead of refusing "weights-loading" (default 30000). */
	weightsTimeoutMs?: number;
}

/** "node" = the terrain node itself changed (visibility, physics shape, own geometry). */
export type TerrainChangeKind = "heights" | "holes" | "weights" | "layers" | "material" | "grid" | "node";
/** "layer-edit" = live writes of the layer proxy and updateLayer({ undo: false }); UIs don't re-key their fields for it (§1.4). */
export type TerrainChangeReason = "stroke" | "undo" | "redo" | "operation" | "resize" | "layers" | "layer-edit" | "settings" | "load";

export interface ITerrainChangedEvent {
	mesh: Mesh;
	kinds: TerrainChangeKind[];
	reason: TerrainChangeReason;
}

export interface ITerrainStrokeResult {
	dabs: number;
	changed: TerrainChangeKind[];
	worldHeightRange: [number, number];
	staleDecals: number;
	warnings: string[];
}

/** Options of addTerrainMesh / initializeTerrainMesh. */
export interface ITerrainCreateOptions {
	/** Default "New Terrain". */
	name?: string;
	/** Default getDefaultTerrainSubdivisions (about 40 cm cells). */
	subdivisions?: number;
	/** Local cm along X, default TERRAIN_NEW_TERRAIN_SIZE. */
	width?: number;
	/** Local cm along Z, default TERRAIN_NEW_TERRAIN_SIZE. */
	height?: number;
	weightMapSize?: number;
	layerTextureSize?: number;
}

export interface ITerrainResizeOptions {
	width?: number;
	height?: number;
	subdivisions?: number;
}

export interface ITerrainMaterialSettingsPatch {
	enabled?: boolean;
	weightMapSize?: number;
	layerTextureSize?: number;
	anisotropy?: number;
	heightBlend?: boolean;
	heightBlendTransition?: number;
}

export interface ITerrainHeightImportOptions {
	minWorld: number;
	maxWorld: number;
	mode: "replace" | "add" | "max" | "min";
	flipY?: boolean;
}

export interface ITerrainUpdateLayerOptions {
	/** Default false (notifies reason "layer-edit"). true registers one undo entry (previous values taken from `previous` or the current data) and notifies reason "layers". */
	undo?: boolean;
	previous?: Partial<Omit<ITerrainLayerData, "id">>;
}

/** Flat, field-friendly view of one layer (never dotted tuple paths, §1.10): each property set calls updateLayer(mesh, id, patch, { undo: false }). */
export interface ITerrainLayerProxy {
	readonly id: string;
	name: string;
	normalConvention: TerrainNormalConvention;
	roughnessChannel: TerrainMapChannel;
	roughnessInvert: boolean;
	aoChannel: TerrainMapChannel;
	heightChannel: TerrainMapChannel;
	tileSizeX: number;
	tileSizeZ: number;
	tileOffsetX: number;
	tileOffsetZ: number;
	roughness: number;
	metallic: number;
	normalStrength: number;
	aoStrength: number;
	heightScale: number;
	heightOffset: number;
}

export type TerrainOperation =
	| { type: "generate"; params: ITerrainGenerateParams; mode: "replace" | "add" }
	| { type: "smooth"; iterations: number; strength: number }
	| { type: "erode-thermal"; iterations: number; talusDegrees: number; amount: number }
	| { type: "erode-hydraulic"; droplets: number; seed: number }
	| { type: "terrace"; step: number; sharpness: number; offset: number }
	| { type: "flatten"; heightWorld: number }
	| { type: "offset"; amountWorld: number }
	| { type: "scale"; factor: number; pivotWorld: number }
	| { type: "normalize"; minWorld: number; maxWorld: number }
	| { type: "clear-holes" }
	| { type: "fill-layer"; layerId: string }
	| { type: "normalize-weights" };

export interface ITerrainOperationResult {
	changed: TerrainChangeKind[];
	worldHeightRange: [number, number];
	warnings: string[];
}

export interface ITerrainOverlayOptions {
	activeLayerId?: string | null;
	contourInterval?: number;
	opacity?: number;
}

export interface ITerrainMaterialEntry {
	material: Material;
	plugin: TerrainMaterialPlugin;
	/** Meshes of scene.meshes bound to the material. */
	meshes: Mesh[];
	weightMapCount: 1 | 2;
	/** Dirty since the last save, per weight map. */
	dirty: [boolean, boolean];
}

export interface ITerrainDependentsStatus {
	physics: "none" | "mesh" | "box" | "other";
	physicsTriangles: number;
	decals: { total: number; stale: number; merged: number };
	/** Project-relative paths of .navmesh folders using the terrain. */
	navmeshes: string[];
	lods: number;
	collisionProxy: "none" | "up-to-date" | "stale";
	sharedGeometry: number;
	sharedMaterial: number;
	instances: number;
}

export interface ITerrainBusyInfo {
	/** e.g. "Eroding", "Generating", "Resampling", "Converting". */
	label: string;
	/** 0..1. */
	progress: number;
	meshId: string | null;
}

/** Cursor footprint (§4.15): size x size points in brush space, row-major (row j along bv from -1 to +1, column i along bu from -1 to +1). */
export interface ITerrainFootprint {
	size: number;
	/** World positions on the surface, size² x 3. */
	positions: Float32Array;
	/** Filtered dab weight 0..1 per point (0 outside the terrain). */
	weights: Float32Array;
}

/** Height patch of a brush capture (§4.16): the normalized image plus the world heights its 0 and 1 stand for. */
export interface ITerrainHeightPatch extends ITerrainImage {
	/** World height (cm) of the lowest sample (value 0). */
	minHeight: number;
	/** World height (cm) of the highest sample (value 1; equals minHeight on a flat patch, whose values are all 0). */
	maxHeight: number;
}
