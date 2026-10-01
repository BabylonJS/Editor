import { detectTerrainLayerMaps, getTerrainMapStem, type ITerrainDetectedLayerMaps } from "../../../../tools/terrain/core/layer-maps";

import { formatTerrainPlural, getTerrainFileBaseName, getTerrainFileName } from "./format";

export type TerrainDropZone = "brush-section" | "layers-list" | "layer-row" | "map-slot";

export interface ITerrainDropContext {
	zone: TerrainDropZone;
	isTerrain: boolean;
	hasTerrainMaterial: boolean;
	layerCount: number;
	/** layer-row / map-slot zones. */
	layerId?: string | null;
	/** map-slot zone. */
	slot?: "albedo" | "normal" | "roughness" | "ao" | "height" | null;
}

export type TerrainDropAction =
	| { type: "add-brushes"; paths: string[] }
	| { type: "add-layers"; groups: ITerrainDetectedLayerMaps[] }
	| { type: "layer-from-material"; path: string; layerId: string | null }
	| { type: "assign-maps"; layerId: string; maps: Partial<ITerrainDetectedLayerMaps> }
	| { type: "layer-mask"; layerId: string; path: string }
	| { type: "import-splat"; paths: [string, string | null] }
	| { type: "none"; reason: string };

/** Class of a dropped file (§4.19), from its lower-cased extension. */
export type TerrainDropFileKind = "image" | "material" | "exr" | "unusable";

/** Images of §4.19 (brushes accept all of them). */
export const TERRAIN_DROP_IMAGE_EXTENSIONS: readonly string[] = [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"];
/** Layer sources are decoded by the browser at runtime (§5.5.1): no TIFF. Same list as io/sources TERRAIN_SOURCE_IMAGE_EXTENSIONS. */
export const TERRAIN_DROP_LAYER_SOURCE_EXTENSIONS: readonly string[] = [".png", ".jpg", ".jpeg", ".webp", ".bmp"];
/** Layer masks are copied like layer sources then read with sharp (no BMP). */
export const TERRAIN_DROP_MASK_EXTENSIONS: readonly string[] = [".png", ".jpg", ".jpeg", ".webp"];
/** Splat maps are 8-bit RGBA images read with sharp (§1.12). */
export const TERRAIN_DROP_SPLAT_EXTENSIONS: readonly string[] = [".png", ".tif", ".tiff"];

/** Maximum number of layers of a terrain material (TERRAIN_MAX_LAYERS of babylonjs-editor-tools; this module stays pure). */
const TERRAIN_DROP_MAX_LAYERS = 8;

/** Text of the overlay of a drop zone while the dragged files are not known yet (OS drags: file names are not readable during dragover, §1.9). */
export const TERRAIN_DROP_PENDING_TEXT = "Drop to add…";

/** Reasons of the "none" actions. */
export const TERRAIN_DROP_REASON_NOT_TERRAIN = "Create a terrain first.";
export const TERRAIN_DROP_REASON_NOTHING = "Nothing to do with these files here.";
export const TERRAIN_DROP_REASON_EXR = "EXR isn't supported.";
export const TERRAIN_DROP_REASON_MAX_LAYERS = "8 layers maximum (2 weight maps).";

const TERRAIN_SPLAT_NAME_REGEX = /(^|[_\-. ])(splat|splatmap|control|weights?)([_\-. ]|\d|$)/i;
/** DirectX normal maps (§1.10 map slots). */
const TERRAIN_DIRECTX_NORMAL_NAME_REGEX = /(^|[_\-. ])(dx|directx|normaldx|nor_dx)([_\-. ]|$)/i;

/**
 * Lower-cased extension of the file name of a path ("" when none): "/a/B.PNG" → ".png".
 * @param path defines the path ("/" or "\" separators).
 */
export function getTerrainDropExtension(path: string): string {
	const name = getTerrainFileName(path);
	const dot = name.lastIndexOf(".");
	return dot > 0 ? name.substring(dot).toLowerCase() : "";
}

/**
 * Class of a dropped file (§4.19): images, materials, EXR (reported as unsupported), anything else unusable.
 * @param path defines the path of the file.
 */
export function getTerrainDropFileKind(path: string): TerrainDropFileKind {
	const extension = getTerrainDropExtension(path);

	if (TERRAIN_DROP_IMAGE_EXTENSIONS.includes(extension)) {
		return "image";
	}

	if (extension === ".material") {
		return "material";
	}

	if (extension === ".exr") {
		return "exr";
	}

	return "unusable";
}

/**
 * Text tested by the name rules: the stem of getTerrainMapStem, or the file name without extension when the name is only a map suffix.
 */
function getTerrainDropNameStem(path: string): string {
	const stem = getTerrainMapStem(getTerrainFileName(path)).stem;
	return stem || getTerrainFileBaseName(path).toLowerCase();
}

/**
 * Whether the file name designates a splat map: /(^|[_\-. ])(splat|splatmap|control|weights?)([_\-. ]|\d|$)/i on the stem (§4.19).
 * @param path defines the path of the file.
 */
export function isTerrainSplatFileName(path: string): boolean {
	return TERRAIN_SPLAT_NAME_REGEX.test(getTerrainDropNameStem(path));
}

/**
 * Whether the file name designates a layer mask (map "mask" of getTerrainMapStem: "_mask" / "_opacity" suffixes, §4.19).
 * @param path defines the path of the file.
 */
export function isTerrainMaskFileName(path: string): boolean {
	return getTerrainMapStem(getTerrainFileName(path)).map === "mask";
}

/**
 * Whether the file name designates a DirectX normal map (§1.10 map slots).
 * @param path defines the path of the file.
 */
export function isTerrainDirectXNormalFileName(path: string): boolean {
	return TERRAIN_DIRECTX_NORMAL_NAME_REGEX.test(getTerrainFileName(path)) || getTerrainMapStem(getTerrainFileName(path)).variant === "directx";
}

function hasTerrainDropExtension(path: string, extensions: readonly string[]): boolean {
	return extensions.includes(getTerrainDropExtension(path));
}

function compareTerrainDropFileNames(a: string, b: string): number {
	return getTerrainFileName(a).localeCompare(getTerrainFileName(b), undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Merges the groups of detectTerrainLayerMaps into the maps of ONE layer (layer-row drops, §4.19): for each slot the first group providing it
 * wins, with its channel/convention settings. The name is not part of the result (the row keeps its name).
 * @param groups defines the detected groups.
 */
export function mergeTerrainDetectedLayerMaps(groups: readonly ITerrainDetectedLayerMaps[]): Partial<ITerrainDetectedLayerMaps> {
	const maps: Partial<ITerrainDetectedLayerMaps> = {};

	for (const group of groups) {
		if (group.albedo && maps.albedo === undefined) {
			maps.albedo = group.albedo;
		}

		if (group.normal && maps.normal === undefined) {
			maps.normal = group.normal;
			maps.normalConvention = group.normalConvention;
		}

		if (group.roughnessMap && maps.roughnessMap === undefined) {
			maps.roughnessMap = group.roughnessMap;
			maps.roughnessChannel = group.roughnessChannel;
			maps.roughnessInvert = group.roughnessInvert;
		}

		if (group.aoMap && maps.aoMap === undefined) {
			maps.aoMap = group.aoMap;
			maps.aoChannel = group.aoChannel;
		}

		if (group.heightMap && maps.heightMap === undefined) {
			maps.heightMap = group.heightMap;
			maps.heightChannel = group.heightChannel;
		}
	}

	return maps;
}

/**
 * Maps of a single image dropped on a map slot (§4.19 "assign-maps({ [slot]: path })"). The channel settings follow the file name when it is
 * recognised (dedicated map → luminance, ORM/ARM → AO r / roughness g, glossiness → invert); a DirectX name sets the DirectX convention (§1.10).
 * @param slot defines the slot under the pointer.
 * @param path defines the dropped image.
 */
export function createTerrainSlotMaps(slot: "albedo" | "normal" | "roughness" | "ao" | "height", path: string): Partial<ITerrainDetectedLayerMaps> {
	const parsed = getTerrainMapStem(getTerrainFileName(path));

	switch (slot) {
		case "albedo":
			return { albedo: path };

		case "normal":
			return isTerrainDirectXNormalFileName(path) ? { normal: path, normalConvention: "directx" } : { normal: path };

		case "roughness":
			if (parsed.map === "roughness") {
				return { roughnessMap: path, roughnessChannel: "luminance", roughnessInvert: parsed.variant === "invert" };
			}

			if (parsed.map === "orm") {
				return { roughnessMap: path, roughnessChannel: "g", roughnessInvert: false };
			}

			return { roughnessMap: path };

		case "ao":
			if (parsed.map === "ao") {
				return { aoMap: path, aoChannel: "luminance" };
			}

			if (parsed.map === "orm") {
				return { aoMap: path, aoChannel: "r" };
			}

			return { aoMap: path };

		case "height":
			return parsed.map === "height" ? { heightMap: path, heightChannel: "luminance" } : { heightMap: path };
	}
}

interface ITerrainClassifiedDrop {
	/** Every image (brush images). */
	images: string[];
	materials: string[];
	exrs: string[];
}

function classifyTerrainDrop(paths: readonly string[]): ITerrainClassifiedDrop {
	const result: ITerrainClassifiedDrop = { images: [], materials: [], exrs: [] };
	const seen = new Set<string>();

	for (const path of paths) {
		if (typeof path !== "string" || !path || seen.has(path)) {
			continue;
		}

		seen.add(path);

		switch (getTerrainDropFileKind(path)) {
			case "image":
				result.images.push(path);
				break;
			case "material":
				result.materials.push(path);
				break;
			case "exr":
				result.exrs.push(path);
				break;
		}
	}

	return result;
}

function createTerrainNoDropAction(files: ITerrainClassifiedDrop, paths: readonly string[]): TerrainDropAction {
	const usable = paths.filter((path) => typeof path === "string" && path);
	if (files.exrs.length > 0 && files.exrs.length === usable.length) {
		return { type: "none", reason: TERRAIN_DROP_REASON_EXR };
	}

	return { type: "none", reason: TERRAIN_DROP_REASON_NOTHING };
}

/** 1-2 splat-named images, sorted by name (first = layers 1-4): every image of the drop must be one of them. */
function routeTerrainSplatDrop(files: ITerrainClassifiedDrop): TerrainDropAction | null {
	const splats = files.images.filter((path) => hasTerrainDropExtension(path, TERRAIN_DROP_SPLAT_EXTENSIONS) && isTerrainSplatFileName(path)).sort(compareTerrainDropFileNames);

	if (splats.length < 1 || splats.length > 2 || splats.length !== files.images.length) {
		return null;
	}

	return { type: "import-splat", paths: [splats[0], splats[1] ?? null] };
}

/** Rules of the layers list ("Add layer" zone): a material or texture sets create layers, splat maps open their import dialog. */
function routeTerrainLayersListDrop(context: ITerrainDropContext, files: ITerrainClassifiedDrop, paths: readonly string[]): TerrainDropAction {
	if (files.materials.length > 0) {
		if (context.layerCount >= TERRAIN_DROP_MAX_LAYERS) {
			return { type: "none", reason: TERRAIN_DROP_REASON_MAX_LAYERS };
		}

		return { type: "layer-from-material", path: files.materials[0], layerId: null };
	}

	const splat = routeTerrainSplatDrop(files);
	if (splat) {
		return splat;
	}

	const sources = files.images.filter((path) => hasTerrainDropExtension(path, TERRAIN_DROP_LAYER_SOURCE_EXTENSIONS));
	const groups = sources.length ? detectTerrainLayerMaps(sources) : [];
	if (groups.length > 0) {
		if (context.layerCount >= TERRAIN_DROP_MAX_LAYERS) {
			return { type: "none", reason: TERRAIN_DROP_REASON_MAX_LAYERS };
		}

		return { type: "add-layers", groups };
	}

	return createTerrainNoDropAction(files, paths);
}

/**
 * Pure drop router (§4.19): decides what a drop does from the zone and the terrain state.
 * paths: expanded files (folders already expanded by expandTerrainDroppedPaths). Pure.
 * @param context defines the drop zone and the state of the target terrain.
 * @param paths defines the dropped files (absolute paths).
 */
export function routeTerrainDrop(context: ITerrainDropContext, paths: string[]): TerrainDropAction {
	if (!context.isTerrain) {
		return { type: "none", reason: TERRAIN_DROP_REASON_NOT_TERRAIN };
	}

	const files = classifyTerrainDrop(paths);

	switch (context.zone) {
		case "brush-section":
			if (files.images.length > 0) {
				return { type: "add-brushes", paths: files.images };
			}
			break;

		case "map-slot": {
			const sources = files.images.filter((path) => hasTerrainDropExtension(path, TERRAIN_DROP_LAYER_SOURCE_EXTENSIONS));
			if (context.layerId && context.slot && sources.length === 1 && files.images.length === 1) {
				return { type: "assign-maps", layerId: context.layerId, maps: createTerrainSlotMaps(context.slot, sources[0]) };
			}
			break;
		}

		case "layer-row": {
			if (!context.layerId) {
				break;
			}

			if (files.materials.length > 0) {
				return { type: "layer-from-material", path: files.materials[0], layerId: context.layerId };
			}

			if (files.images.length === 1 && hasTerrainDropExtension(files.images[0], TERRAIN_DROP_MASK_EXTENSIONS) && isTerrainMaskFileName(files.images[0])) {
				return { type: "layer-mask", layerId: context.layerId, path: files.images[0] };
			}

			const sources = files.images.filter((path) => hasTerrainDropExtension(path, TERRAIN_DROP_LAYER_SOURCE_EXTENSIONS));
			const maps = mergeTerrainDetectedLayerMaps(sources.length ? detectTerrainLayerMaps(sources) : []);
			if (Object.keys(maps).length > 0) {
				return { type: "assign-maps", layerId: context.layerId, maps };
			}
			break;
		}

		case "layers-list":
			return routeTerrainLayersListDrop(context, files, paths);
	}

	return createTerrainNoDropAction(files, paths);
}

/**
 * Paths of the files the action reads. The other dropped files are reported by executeTerrainDropAction (toast.drop-nothing).
 * @param action defines the routed action.
 */
export function getTerrainDropActionPaths(action: TerrainDropAction): string[] {
	switch (action.type) {
		case "add-brushes":
			return [...action.paths];

		case "add-layers": {
			const result: string[] = [];
			for (const group of action.groups) {
				for (const path of [group.albedo, group.normal, group.roughnessMap, group.aoMap, group.heightMap]) {
					if (path && !result.includes(path)) {
						result.push(path);
					}
				}
			}
			return result;
		}

		case "assign-maps": {
			const result: string[] = [];
			for (const path of [action.maps.albedo, action.maps.normal, action.maps.roughnessMap, action.maps.aoMap, action.maps.heightMap]) {
				if (path && !result.includes(path)) {
					result.push(path);
				}
			}
			return result;
		}

		case "layer-from-material":
		case "layer-mask":
			return [action.path];

		case "import-splat":
			return action.paths.filter((path): path is string => !!path);

		case "none":
			return [];
	}
}

/**
 * Dropped files that the action doesn't read (reported as unusable).
 * @param action defines the routed action.
 * @param paths defines the dropped files.
 */
export function getTerrainDropUnusedPaths(action: TerrainDropAction, paths: readonly string[]): string[] {
	const used = new Set(getTerrainDropActionPaths(action));
	const result: string[] = [];

	for (const path of paths) {
		if (typeof path === "string" && path && !used.has(path) && !result.includes(path)) {
			result.push(path);
		}
	}

	return result;
}

export interface ITerrainDropActionTextOptions {
	/** Resolves a layer id to its name (layer-row and map-slot actions): "Set the mask of “Rock”". */
	getLayerName?: (layerId: string) => string | null | undefined;
}

const TERRAIN_DROP_MAP_LABELS: readonly [keyof ITerrainDetectedLayerMaps, string][] = [
	["albedo", "albedo"],
	["normal", "normal"],
	["roughnessMap", "roughness"],
	["aoMap", "ambient occlusion"],
	["heightMap", "height"],
];

function joinTerrainDropLabels(labels: readonly string[]): string {
	if (labels.length <= 1) {
		return labels[0] ?? "";
	}

	return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/**
 * Overlay text of an action (§1.9) with the layer names when a resolver is given ("Set the mask of “Rock”").
 * @param action defines the routed action.
 * @param options defines the optional layer name resolver.
 */
export function formatTerrainDropAction(action: TerrainDropAction, options?: ITerrainDropActionTextOptions): string {
	const layerName = (layerId: string | null): string | null => {
		if (!layerId) {
			return null;
		}

		try {
			return options?.getLayerName?.(layerId) || null;
		} catch {
			return null;
		}
	};

	switch (action.type) {
		case "add-brushes":
			return `Add ${formatTerrainPlural(action.paths.length, "brush")}`;

		case "add-layers":
			return action.groups.length === 1 ? `Create layer “${action.groups[0].name}”` : `Create ${formatTerrainPlural(action.groups.length, "layer")}`;

		case "layer-from-material": {
			const material = getTerrainFileBaseName(action.path);
			if (action.layerId === null) {
				return `Create a layer from “${material}”`;
			}

			const name = layerName(action.layerId);
			return name ? `Use the maps of “${material}” on “${name}”` : `Use the maps of “${material}” on this layer`;
		}

		case "assign-maps": {
			const labels = TERRAIN_DROP_MAP_LABELS.filter(([key]) => !!action.maps[key]).map(([, label]) => label);
			const name = layerName(action.layerId);
			const target = name ? ` of “${name}”` : "";

			if (labels.length === 0) {
				return `Set the maps${target}`;
			}

			return `Set the ${joinTerrainDropLabels(labels)} map${labels.length > 1 ? "s" : ""}${target}`;
		}

		case "layer-mask": {
			const name = layerName(action.layerId);
			return name ? `Set the mask of “${name}”` : "Set the layer mask";
		}

		case "import-splat":
			return "Import splat map…";

		case "none":
			return action.reason;
	}
}

/**
 * Overlay text of §1.9 ("Add 3 brushes", "Create layer “Grass”", "Import splat map…", "Set the layer mask", or the reason
 * of a "none" action such as "Nothing to do with these files here.").
 * @param action defines the routed action.
 */
export function describeTerrainDropAction(action: TerrainDropAction): string {
	return formatTerrainDropAction(action);
}
