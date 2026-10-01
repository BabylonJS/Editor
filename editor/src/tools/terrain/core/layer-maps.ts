export interface ITerrainDetectedLayerMaps {
	name: string;
	albedo: string | null;
	normal: string | null;
	normalConvention: "opengl" | "directx";
	roughnessMap: string | null;
	roughnessChannel: "r" | "g" | "b" | "a" | "luminance";
	roughnessInvert: boolean;
	aoMap: string | null;
	aoChannel: "r" | "g" | "b" | "a" | "luminance";
	heightMap: string | null;
	heightChannel: "r" | "g" | "b" | "a" | "luminance";
}

type TerrainMapKind = "albedo" | "normal" | "roughness" | "ao" | "height" | "orm" | "mask";
type TerrainMapVariant = "directx" | "invert" | null;

interface ITerrainMapSuffix {
	/** Written with "_" between words; "-", "." and " " are accepted as well. */
	suffix: string;
	map: TerrainMapKind;
	variant: TerrainMapVariant;
}

/**
 * Suffix table of §1.10.2, plus "mask" / "opacity" (recognised so layer creation can ignore them) and the bare OpenGL/DirectX tokens of
 * normal maps ("gl", "opengl", "dx", "directx" and their "normal_" / "nor_" forms, as in the DirectX regex of the map slots, §1.10).
 */
const TERRAIN_MAP_SUFFIXES: readonly ITerrainMapSuffix[] = [
	...["albedo", "basecolor", "base_color", "diffuse", "diff", "color", "col"].map((suffix) => ({ suffix, map: "albedo" as const, variant: null })),
	...["normal", "normalgl", "normal_gl", "nor_gl", "nrm", "norm", "nor", "normal_opengl", "nor_opengl", "opengl", "gl"].map((suffix) => ({
		suffix,
		map: "normal" as const,
		variant: null,
	})),
	...["normaldx", "normal_dx", "nor_dx", "normal_directx", "nor_directx", "directx", "dx"].map((suffix) => ({ suffix, map: "normal" as const, variant: "directx" as const })),
	...["roughness", "rough", "rgh"].map((suffix) => ({ suffix, map: "roughness" as const, variant: null })),
	...["gloss", "glossiness", "smoothness"].map((suffix) => ({ suffix, map: "roughness" as const, variant: "invert" as const })),
	...["ao", "ambientocclusion", "occlusion"].map((suffix) => ({ suffix, map: "ao" as const, variant: null })),
	...["height", "displacement", "disp", "bump"].map((suffix) => ({ suffix, map: "height" as const, variant: null })),
	...["orm", "arm"].map((suffix) => ({ suffix, map: "orm" as const, variant: null })),
	...["mask", "opacity"].map((suffix) => ({ suffix, map: "mask" as const, variant: null })),
	// Longest first: "nor_gl" beats "gl", "base_color" beats "color", "ambientocclusion" beats "occlusion"...
].sort((a, b) => b.suffix.length - a.suffix.length);

/** Trailing resolution/variant tokens stripped repeatedly before matching (§1.10.2): _2k, -4K, .1024px, _2048, _lod0... */
const TERRAIN_MAP_TOKEN_REGEX = /[_\-. ](\d+k|\d+px|\d{3,5}|lod\d+)$/i;
const TERRAIN_MAP_SEPARATOR_REGEX = /[_\-. ]/;

interface ITerrainParsedMapName {
	/** Lower-case stem (§1.10.2). */
	stem: string;
	/** Same stem in the original casing (layer names). */
	displayStem: string;
	map: TerrainMapKind | null;
	variant: TerrainMapVariant;
}

interface ITerrainLayerMapGroup {
	name: string;
	albedo: string | null;
	fallbackAlbedo: string | null;
	normal: string | null;
	normalDirectX: string | null;
	roughness: string | null;
	gloss: string | null;
	ao: string | null;
	height: string | null;
	orm: string | null;
}

/**
 * Map auto-detection of §1.10.2: resolution/variant tokens stripped first; mask/opacity files ignored; one group per stem (one layer each,
 * named after the stem in the original casing of the first file, in order of first appearance). Files whose name is only a suffix
 * ("Normal.png") are grouped by folder and the layer is named after the folder.
 * In a group: a file without a recognised suffix is the albedo when there is no albedo file (so a single unsuffixed file is an albedo);
 * an OpenGL normal wins over a DirectX one; a roughness map over a glossiness map (invert) over the G channel of an ORM/ARM file;
 * an AO map over the R channel of an ORM/ARM file. Dedicated roughness/AO/height maps are read as luminance.
 */
export function detectTerrainLayerMaps(paths: string[]): ITerrainDetectedLayerMaps[] {
	const groups = new Map<string, ITerrainLayerMapGroup>();

	for (const path of paths) {
		if (typeof path !== "string" || !path) {
			continue;
		}

		const { directory, fileName } = splitTerrainPath(path);
		const parsed = parseTerrainMapName(fileName);
		if (parsed.map === "mask") {
			continue;
		}

		const key = parsed.stem ? `stem:${parsed.stem}` : `folder:${directory.toLowerCase()}`;
		let group = groups.get(key);
		if (!group) {
			group = {
				name: parsed.displayStem || getTerrainFolderName(directory) || removeTerrainExtension(fileName) || "Layer",
				albedo: null,
				fallbackAlbedo: null,
				normal: null,
				normalDirectX: null,
				roughness: null,
				gloss: null,
				ao: null,
				height: null,
				orm: null,
			};
			groups.set(key, group);
		}

		switch (parsed.map) {
			case "albedo":
				group.albedo ??= path;
				break;
			case "normal":
				if (parsed.variant === "directx") {
					group.normalDirectX ??= path;
				} else {
					group.normal ??= path;
				}
				break;
			case "roughness":
				if (parsed.variant === "invert") {
					group.gloss ??= path;
				} else {
					group.roughness ??= path;
				}
				break;
			case "ao":
				group.ao ??= path;
				break;
			case "height":
				group.height ??= path;
				break;
			case "orm":
				group.orm ??= path;
				break;
			default:
				group.fallbackAlbedo ??= path;
				break;
		}
	}

	return Array.from(groups.values(), (group) => createTerrainDetectedLayerMaps(group));
}

/** Stem of a file name after token stripping (exposed for the drop router and tests). Directories and the extension are removed first. */
export function getTerrainMapStem(fileName: string): {
	stem: string;
	map: "albedo" | "normal" | "roughness" | "ao" | "height" | "orm" | "mask" | null;
	/** normal: DirectX suffix; roughness: glossiness/smoothness suffix. */
	variant: "directx" | "invert" | null;
} {
	const parsed = parseTerrainMapName(splitTerrainPath(typeof fileName === "string" ? fileName : "").fileName);

	return {
		stem: parsed.stem,
		map: parsed.map,
		variant: parsed.variant,
	};
}

function createTerrainDetectedLayerMaps(group: ITerrainLayerMapGroup): ITerrainDetectedLayerMaps {
	const result: ITerrainDetectedLayerMaps = {
		name: group.name,
		albedo: group.albedo ?? group.fallbackAlbedo,
		normal: group.normal ?? group.normalDirectX,
		normalConvention: !group.normal && group.normalDirectX ? "directx" : "opengl",
		// Channels of unset maps keep the defaults of createDefaultTerrainLayer.
		roughnessMap: null,
		roughnessChannel: "g",
		roughnessInvert: false,
		aoMap: null,
		aoChannel: "r",
		heightMap: null,
		heightChannel: "r",
	};

	if (group.roughness) {
		result.roughnessMap = group.roughness;
		result.roughnessChannel = "luminance";
	} else if (group.gloss) {
		result.roughnessMap = group.gloss;
		result.roughnessChannel = "luminance";
		result.roughnessInvert = true;
	} else if (group.orm) {
		result.roughnessMap = group.orm;
		result.roughnessChannel = "g";
	}

	if (group.ao) {
		result.aoMap = group.ao;
		result.aoChannel = "luminance";
	} else if (group.orm) {
		result.aoMap = group.orm;
		result.aoChannel = "r";
	}

	if (group.height) {
		result.heightMap = group.height;
		result.heightChannel = "luminance";
	}

	return result;
}

function parseTerrainMapName(fileName: string): ITerrainParsedMapName {
	const base = removeTerrainExtension(fileName);
	const stripped = stripTerrainMapTokens(base.toLowerCase());
	const displayStripped = stripTerrainMapTokens(base);

	// Separators inside multi-word suffixes are equivalent ("normal-gl" = "normal_gl"): compare on a copy where they are all "_"
	// (a one-to-one character replacement, so positions are unchanged).
	const normalized = stripped.replace(/[-. ]/g, "_");

	for (const entry of TERRAIN_MAP_SUFFIXES) {
		if (normalized === entry.suffix) {
			return { stem: "", displayStem: "", map: entry.map, variant: entry.variant };
		}

		const start = normalized.length - entry.suffix.length;
		if (start > 0 && normalized.endsWith(entry.suffix) && TERRAIN_MAP_SEPARATOR_REGEX.test(stripped.charAt(start - 1))) {
			const stem = trimTerrainSeparators(stripped.substring(0, start - 1));
			return {
				stem,
				displayStem: getTerrainDisplayStem(displayStripped, stripped, start - 1, stem),
				map: entry.map,
				variant: entry.variant,
			};
		}
	}

	const stem = trimTerrainSeparators(stripped);
	return {
		stem,
		displayStem: getTerrainDisplayStem(displayStripped, stripped, stripped.length, stem),
		map: null,
		variant: null,
	};
}

/** Original-casing stem when the case-insensitive stripping kept the same length (always for ASCII names), else the lower-case stem. */
function getTerrainDisplayStem(displayStripped: string, stripped: string, end: number, stem: string): string {
	if (displayStripped.length !== stripped.length) {
		return stem;
	}

	const display = trimTerrainSeparators(displayStripped.substring(0, end));
	return display.toLowerCase() === stem ? display : stem;
}

function stripTerrainMapTokens(name: string): string {
	let result = name;
	for (let match = TERRAIN_MAP_TOKEN_REGEX.exec(result); match; match = TERRAIN_MAP_TOKEN_REGEX.exec(result)) {
		result = result.substring(0, match.index);
	}

	return result;
}

function trimTerrainSeparators(value: string): string {
	return value.replace(/^[_\-. ]+|[_\-. ]+$/g, "");
}

function removeTerrainExtension(fileName: string): string {
	const dot = fileName.lastIndexOf(".");
	return dot > 0 ? fileName.substring(0, dot) : fileName;
}

function splitTerrainPath(path: string): { directory: string; fileName: string } {
	const normalized = path.replace(/\\/g, "/");
	const slash = normalized.lastIndexOf("/");

	return slash >= 0 ? { directory: normalized.substring(0, slash), fileName: normalized.substring(slash + 1) } : { directory: "", fileName: normalized };
}

function getTerrainFolderName(directory: string): string {
	const slash = directory.lastIndexOf("/");
	return slash >= 0 ? directory.substring(slash + 1) : directory;
}
