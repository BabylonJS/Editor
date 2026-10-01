import type { Scene } from "@babylonjs/core/scene";

/** Plugin name: key used by material.pluginManager.getPlugin(). */
export const TERRAIN_MATERIAL_PLUGIN_NAME = "TerrainMaterial";
/** getClassName() of the plugin: key of the "plugins" map of the material JSON, and "BABYLON." + it in the type store. */
export const TERRAIN_MATERIAL_PLUGIN_CLASS_NAME = "TerrainMaterialPlugin";
export const TERRAIN_DATA_VERSION = 1;
export const TERRAIN_MAX_LAYERS = 8;
export const TERRAIN_LAYERS_PER_WEIGHT_MAP = 4;
/** Limits of the grid of a TerrainMesh. */
export const TERRAIN_MIN_SUBDIVISIONS = 2;
export const TERRAIN_MAX_SUBDIVISIONS = 1024;
export const TERRAIN_WEIGHT_MAP_SIZES: readonly number[] = [256, 512, 1024, 2048];
export const TERRAIN_LAYER_TEXTURE_SIZES: readonly number[] = [256, 512, 1024, 2048];
export const TERRAIN_PORTABLE_SAMPLER_BUDGET = 16;

export type TerrainMapChannel = "r" | "g" | "b" | "a" | "luminance";
export type TerrainNormalConvention = "opengl" | "directx";
export type TerrainLoadState = "idle" | "loading" | "ready" | "error";
export type TerrainBudgetFeature = "normals" | "weights1" | "albedo" | "terrain";

export enum TerrainDebugView {
	None = 0,
	LayerWeights = 1,
	ActiveLayer = 2,
	Contours = 3,
	Slope = 4,
	Grid = 5,
}

export interface ITerrainLayerData {
	/** Stable id: "l-" + 8 lowercase hex characters. Unique inside a material. */
	id: string;
	name: string;
	/** Project-relative image paths ("assets/..."), resolved against the plugin rootUrl. null = not set. */
	albedo: string | null;
	normal: string | null;
	normalConvention: TerrainNormalConvention;
	roughnessMap: string | null;
	roughnessChannel: TerrainMapChannel;
	/** true when the roughness source is a glossiness/smoothness map (value inverted at packing). */
	roughnessInvert: boolean;
	aoMap: string | null;
	aoChannel: TerrainMapChannel;
	heightMap: string | null;
	heightChannel: TerrainMapChannel;
	/** sRGB 0..1 multiplier of the albedo. */
	tint: [number, number, number];
	/** Size in centimeters (terrain local units) of one texture repetition along local X / Z; > 0. */
	tileSize: [number, number];
	/** Offset in centimeters along local X / Z. */
	tileOffset: [number, number];
	/** 0..1, multiplies the roughness map (a constant when there is no map). */
	roughness: number;
	/** 0..1 constant. */
	metallic: number;
	/** 0..2. */
	normalStrength: number;
	/** 0..1: 0 ignores the AO map, 1 applies it fully. */
	aoStrength: number;
	/** Height-blend height = clamp(heightValue * heightScale + heightOffset, 0, 1). 0..2. */
	heightScale: number;
	/** -1..1. */
	heightOffset: number;
}

export interface ITerrainMaterialData {
	version: number;
	enabled: boolean;
	/** Project-relative PNG paths of the weight maps (map k holds layers 4k..4k+3); null = not written yet. */
	weightMaps: [string | null, string | null];
	/** Size of the weight maps in the editor (square, one of TERRAIN_WEIGHT_MAP_SIZES). Games use the decoded file size. */
	weightMapSize: number;
	/** Size of every layer of the texture arrays (one of TERRAIN_LAYER_TEXTURE_SIZES) before the quality factor. */
	layerTextureSize: number;
	/** Anisotropic filtering of the layer arrays, 1..16. */
	anisotropy: number;
	heightBlend: boolean;
	/** 0.01..1. */
	heightBlendTransition: number;
	/** 0..TERRAIN_MAX_LAYERS layers (at least 1 once painting is enabled). */
	layers: ITerrainLayerData[];
	/** Editor-only data, preserved verbatim, ignored at runtime. */
	editor: Record<string, unknown>;
}

export interface ITerrainWeightMap {
	readonly size: number;
	/**
	 * RGBA8, size * size * 4 bytes, TEXTURE ORDER: row 0 = v≈0 = local -Z edge, column 0 = local -X edge.
	 * Channel c of map k = weight of layer 4k + c (0..255). The 8 weights of a texel sum to 255 (editor invariant).
	 */
	readonly data: Uint8Array;
}

export interface ITerrainDecodedImage {
	width: number;
	height: number;
	/** RGBA8 un-premultiplied, TEXTURE ORDER (row 0 = bottom row of the image). */
	data: Uint8Array;
}

export interface ITerrainImageDecodeOptions {
	/**
	 * true when the file's ALPHA channel carries data for some layer (height/roughness/AO channel "a"): PNG files are then decoded
	 * exactly by decodeTerrainPng and resized with resizeTerrainImage (a 2D canvas premultiplies and damages RGB where alpha is low).
	 * The default decoders (decodeTerrainLayerSourceBytes) also decode every PNG that HAS an alpha channel (colour type 4/6 or tRNS) exactly,
	 * whether or not a layer reads it: custom decoders should do the same.
	 */
	exact?: boolean;
}

export interface ITerrainImageDecoder {
	/** Loads url through scene file loading, decodes it resized to width x height, in TEXTURE ORDER (rows flipped in JS). null on failure. */
	decode(url: string, width: number, height: number, scene: Scene, options?: ITerrainImageDecodeOptions): Promise<ITerrainDecodedImage | null>;
}

export interface ITerrainBudgetInfo {
	baseSamplers: number;
	terrainSamplers: number;
	budget: number;
	dropped: TerrainBudgetFeature[];
}

export interface ITerrainDebugOptions {
	view: TerrainDebugView;
	/** Layer index shown by TerrainDebugView.ActiveLayer. */
	activeLayer: number;
	/** World centimeters between two contour lines. */
	contourInterval: number;
	/** Subdivisions drawn by TerrainDebugView.Grid. */
	gridSubdivisions: number;
	/** 0..1. */
	opacity: number;
}

export function createTerrainLayerId(): string {
	let id = "l-";
	for (let i = 0; i < 8; ++i) {
		id += Math.floor(Math.random() * 16).toString(16);
	}
	return id;
}

export function createDefaultTerrainLayer(partial?: Partial<ITerrainLayerData>): ITerrainLayerData {
	return {
		id: createTerrainLayerId(),
		name: "Layer",
		albedo: null,
		normal: null,
		normalConvention: "opengl",
		roughnessMap: null,
		roughnessChannel: "g",
		roughnessInvert: false,
		aoMap: null,
		aoChannel: "r",
		heightMap: null,
		heightChannel: "r",
		tint: [1, 1, 1],
		tileSize: [200, 200],
		tileOffset: [0, 0],
		roughness: 1,
		metallic: 0,
		normalStrength: 1,
		aoStrength: 1,
		heightScale: 1,
		heightOffset: 0,
		...partial,
	};
}

export function createDefaultTerrainMaterialData(): ITerrainMaterialData {
	return {
		version: TERRAIN_DATA_VERSION,
		enabled: true,
		weightMaps: [null, null],
		weightMapSize: 1024,
		layerTextureSize: 1024,
		anisotropy: 8,
		heightBlend: false,
		heightBlendTransition: 0.2,
		layers: [],
		editor: {},
	};
}

/** Tolerant parse (rules in §5.7). Never throws. */
export function parseTerrainMaterialData(source: unknown): { data: ITerrainMaterialData; warnings: string[] } {
	const warnings: string[] = [];

	const isObject = (value: unknown): value is Record<string, unknown> => {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	};
	const isFiniteNumber = (value: unknown): value is number => {
		return typeof value === "number" && Number.isFinite(value);
	};
	const clampNumber = (value: unknown, min: number, max: number, fallback: number): number => {
		return isFiniteNumber(value) ? Math.min(max, Math.max(min, value)) : fallback;
	};
	const readPath = (value: unknown): string | null => {
		return typeof value === "string" && value !== "" ? value : null;
	};
	// Weight maps are data files of the scene, relative to its root: absolute paths and empty, "." or ".." segments are ignored.
	const readWeightMapPath = (value: unknown): string | null => {
		const path = readPath(value);
		if (path === null || isTerrainRelativeDataPath(path)) {
			return path;
		}

		warnings.push(`Invalid terrain weight map path "${path}" (absolute, or with an empty, "." or ".." segment): it is ignored.`);
		return null;
	};
	const readChannel = (value: unknown, fallback: TerrainMapChannel): TerrainMapChannel => {
		return value === "r" || value === "g" || value === "b" || value === "a" || value === "luminance" ? value : fallback;
	};
	const snapSize = (value: unknown, sizes: readonly number[], fallback: number): number => {
		if (!isFiniteNumber(value)) {
			return fallback;
		}

		let nearest = sizes[0];
		for (const size of sizes) {
			if (Math.abs(size - value) < Math.abs(nearest - value)) {
				nearest = size;
			}
		}

		return nearest;
	};
	const readTileSize = (value: unknown, fallback: number): number => {
		return isFiniteNumber(value) && value >= 1 ? value : fallback;
	};
	const readTileOffset = (value: unknown): number => {
		return isFiniteNumber(value) ? value : 0;
	};

	try {
		const data = createDefaultTerrainMaterialData();

		if (!isObject(source)) {
			data.enabled = false;
			warnings.push("Invalid terrain data: the terrain layers are disabled.");
			return { data, warnings };
		}

		// Version: a number >= 1, else 1. Newer versions are read with the known fields only (the plugin keeps the raw source, §5.7).
		data.version = isFiniteNumber(source.version) && source.version >= 1 ? source.version : TERRAIN_DATA_VERSION;
		if (data.version > TERRAIN_DATA_VERSION) {
			warnings.push(`Terrain data version ${data.version} is newer than supported (${TERRAIN_DATA_VERSION}): unknown fields are ignored.`);
		}

		data.enabled = typeof source.enabled === "boolean" ? source.enabled : true;

		const weightMaps = Array.isArray(source.weightMaps) ? source.weightMaps : [];
		data.weightMaps = [readWeightMapPath(weightMaps[0]), readWeightMapPath(weightMaps[1])];

		data.weightMapSize = snapSize(source.weightMapSize, TERRAIN_WEIGHT_MAP_SIZES, 1024);
		data.layerTextureSize = snapSize(source.layerTextureSize, TERRAIN_LAYER_TEXTURE_SIZES, 1024);
		data.anisotropy = isFiniteNumber(source.anisotropy) ? Math.min(16, Math.max(1, Math.round(source.anisotropy))) : 8;
		data.heightBlend = typeof source.heightBlend === "boolean" ? source.heightBlend : false;
		data.heightBlendTransition = clampNumber(source.heightBlendTransition, 0.01, 1, 0.2);

		const sourceLayers = Array.isArray(source.layers) ? source.layers : [];
		if (sourceLayers.length > TERRAIN_MAX_LAYERS) {
			warnings.push(`Terrain data has ${sourceLayers.length} layers: only the first ${TERRAIN_MAX_LAYERS} are kept.`);
		}

		const usedIds = new Set<string>();
		sourceLayers.slice(0, TERRAIN_MAX_LAYERS).forEach((entry: unknown, index: number) => {
			if (!isObject(entry)) {
				warnings.push(`Invalid terrain layer ${index + 1}: default values are used.`);
			}

			const value = isObject(entry) ? entry : {};
			const defaults = createDefaultTerrainLayer();

			// Ids: "l-" + 8 lowercase hex characters, unique inside the material (invalid ones and duplicates get a new id).
			let id = typeof value.id === "string" && /^l-[0-9a-f]{8}$/.test(value.id) ? value.id : null;
			if (id !== null && usedIds.has(id)) {
				warnings.push(`Duplicate terrain layer id "${id}": layer ${index + 1} gets a new id.`);
				id = null;
			}
			while (id === null || usedIds.has(id)) {
				id = createTerrainLayerId();
			}
			usedIds.add(id);

			const tint = Array.isArray(value.tint) ? value.tint : [];
			const tileSize = Array.isArray(value.tileSize) ? value.tileSize : [];
			const tileOffset = Array.isArray(value.tileOffset) ? value.tileOffset : [];

			data.layers.push({
				id,
				name: typeof value.name === "string" ? value.name : defaults.name,
				albedo: readPath(value.albedo),
				normal: readPath(value.normal),
				normalConvention: value.normalConvention === "opengl" || value.normalConvention === "directx" ? value.normalConvention : defaults.normalConvention,
				roughnessMap: readPath(value.roughnessMap),
				roughnessChannel: readChannel(value.roughnessChannel, defaults.roughnessChannel),
				roughnessInvert: typeof value.roughnessInvert === "boolean" ? value.roughnessInvert : defaults.roughnessInvert,
				aoMap: readPath(value.aoMap),
				aoChannel: readChannel(value.aoChannel, defaults.aoChannel),
				heightMap: readPath(value.heightMap),
				heightChannel: readChannel(value.heightChannel, defaults.heightChannel),
				tint: [clampNumber(tint[0], 0, 1, defaults.tint[0]), clampNumber(tint[1], 0, 1, defaults.tint[1]), clampNumber(tint[2], 0, 1, defaults.tint[2])],
				tileSize: [readTileSize(tileSize[0], defaults.tileSize[0]), readTileSize(tileSize[1], defaults.tileSize[1])],
				tileOffset: [readTileOffset(tileOffset[0]), readTileOffset(tileOffset[1])],
				roughness: clampNumber(value.roughness, 0, 1, defaults.roughness),
				metallic: clampNumber(value.metallic, 0, 1, defaults.metallic),
				normalStrength: clampNumber(value.normalStrength, 0, 2, defaults.normalStrength),
				aoStrength: clampNumber(value.aoStrength, 0, 1, defaults.aoStrength),
				heightScale: clampNumber(value.heightScale, 0, 2, defaults.heightScale),
				heightOffset: clampNumber(value.heightOffset, -1, 1, defaults.heightOffset),
			});
		});

		// Editor-only data: preserved verbatim (deep copy), ignored at runtime.
		if (isObject(source.editor)) {
			try {
				const editor = JSON.parse(JSON.stringify(source.editor));
				data.editor = isObject(editor) ? editor : {};
			} catch (e) {
				warnings.push(`Invalid terrain editor data (${e instanceof Error ? e.message : String(e)}): it is dropped.`);
				data.editor = {};
			}
		} else if (source.editor !== undefined) {
			warnings.push("Invalid terrain editor data: it is dropped.");
		}

		return { data, warnings };
	} catch (e) {
		const data = createDefaultTerrainMaterialData();
		data.enabled = false;
		warnings.push(`Invalid terrain data (${e instanceof Error ? e.message : String(e)}): the terrain layers are disabled.`);
		return { data, warnings };
	}
}
/** Deep copy (JSON-safe). */
export function cloneTerrainMaterialData(data: ITerrainMaterialData): ITerrainMaterialData {
	return JSON.parse(JSON.stringify(data));
}

export function getTerrainWeightMapCount(layerCount: number): 1 | 2 {
	return layerCount > TERRAIN_LAYERS_PER_WEIGHT_MAP ? 2 : 1;
}

/** true for a path relative to its root without an empty, "." or ".." segment (no "/…", "//…" nor drive letter). Accepts "\" separators. */
function isTerrainRelativeDataPath(path: string): boolean {
	const slashPath = path.replace(/\\/g, "/");
	if (slashPath.startsWith("/") || /^[A-Za-z]:/.test(slashPath)) {
		return false;
	}

	return !slashPath.split("/").some((segment) => segment === "" || segment === "." || segment === "..");
}
