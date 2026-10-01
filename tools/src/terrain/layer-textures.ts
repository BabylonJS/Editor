import type { Scene } from "@babylonjs/core/scene";

import { TERRAIN_MAX_LAYERS, type ITerrainDecodedImage, type ITerrainLayerData, type ITerrainMaterialData, type TerrainMapChannel } from "./types";

// Pure helpers of the layer texture arrays (§5.5). The per-scene ref-counted cache of the arrays, the decoded-image LRU, the typed
// fallbacks and the deferred disposal (§5.2.3, §5.5.1) are implemented by TerrainMaterialPlugin (plugin.ts), their only user.

export interface ITerrainLayerArrayData {
	size: number;
	layers: number;
	/** RGB = albedo (sRGB bytes), A = height; layer l at offset l * size * size * 4; texture order. */
	albedo: Uint8Array;
	/** RG = normal XY (OpenGL convention), B = roughness, A = AO; null when no layer has normal/roughness/AO sources. */
	normal: Uint8Array | null;
	/** false when no layer has an albedo or height source (the albedo array is then not created). */
	hasAlbedo: boolean;
}

const TERRAIN_DEFAULT_ALBEDO: readonly number[] = [255, 255, 255, 128];
const TERRAIN_DEFAULT_NORMAL: readonly number[] = [128, 128, 255, 255];

/**
 * Pure packing (§5.5.2). images: decoded sources keyed by project-relative path, already size x size, texture order.
 * Missing (or mis-sized) images give the default values of the table: albedo RGB 255, A 128; normal RG 128, B 255, A 255.
 * When no layer has an albedo or height source, `albedo` is empty (the array is not created).
 */
export function packTerrainLayerArrays(layers: readonly ITerrainLayerData[], images: ReadonlyMap<string, ITerrainDecodedImage>, size: number): ITerrainLayerArrayData {
	const count = layers.length;
	const texels = size * size;
	const layerBytes = texels * 4;

	const hasAlbedo = layers.some((layer) => !!(layer.albedo || layer.heightMap));
	const hasNormal = layers.some((layer) => !!(layer.normal || layer.roughnessMap || layer.aoMap));

	const albedo = new Uint8Array(hasAlbedo ? count * layerBytes : 0);
	const normal = hasNormal ? new Uint8Array(count * layerBytes) : null;

	for (let index = 0; index < count; ++index) {
		const layer = layers[index];
		const offset = index * layerBytes;

		if (hasAlbedo) {
			// RGB = albedo: the whole source is copied, its alpha replaced by the height channel (or the default).
			const color = getPackingSource(images, layer.albedo, size);
			const height = getPackingSource(images, layer.heightMap, size);

			if (color) {
				albedo.set(color.subarray(0, layerBytes), offset);
			} else {
				fillPackedTexels(albedo, offset, texels, TERRAIN_DEFAULT_ALBEDO);
			}

			if (height) {
				writePackedChannel({ data: albedo, offset, channel: 3, texels }, height, layer.heightChannel, false);
			} else if (color) {
				fillPackedChannel({ data: albedo, offset, channel: 3, texels }, TERRAIN_DEFAULT_ALBEDO[3]);
			}
		}

		if (normal) {
			// RG = normal XY: the whole source is copied, B and A replaced by roughness and AO (or the defaults).
			const normalMap = getPackingSource(images, layer.normal, size);
			const roughness = getPackingSource(images, layer.roughnessMap, size);
			const ao = getPackingSource(images, layer.aoMap, size);

			if (normalMap) {
				normal.set(normalMap.subarray(0, layerBytes), offset);
				if (layer.normalConvention === "directx") {
					writePackedChannel({ data: normal, offset, channel: 1, texels }, normalMap, 1, true);
				}
			} else {
				fillPackedTexels(normal, offset, texels, TERRAIN_DEFAULT_NORMAL);
			}

			if (roughness) {
				writePackedChannel({ data: normal, offset, channel: 2, texels }, roughness, layer.roughnessChannel, layer.roughnessInvert);
			} else if (normalMap) {
				fillPackedChannel({ data: normal, offset, channel: 2, texels }, TERRAIN_DEFAULT_NORMAL[2]);
			}

			if (ao) {
				writePackedChannel({ data: normal, offset, channel: 3, texels }, ao, layer.aoChannel, false);
			} else if (normalMap) {
				fillPackedChannel({ data: normal, offset, channel: 3, texels }, TERRAIN_DEFAULT_NORMAL[3]);
			}
		}
	}

	return { size, layers: count, albedo, normal, hasAlbedo };
}

function getPackingSource(images: ReadonlyMap<string, ITerrainDecodedImage>, path: string | null, size: number): Uint8Array | null {
	if (!path) {
		return null;
	}

	const image = images.get(path);
	if (!image || image.width !== size || image.height !== size || !image.data || image.data.length < size * size * 4) {
		return null;
	}

	return image.data;
}

/** Channel `channel` (0..3) of the texels of one layer of a packed array. */
interface ITerrainPackedChannel {
	data: Uint8Array;
	/** First byte of the layer. */
	offset: number;
	channel: number;
	texels: number;
}

/** Fills every texel of one layer with an RGBA value (32-bit writes). */
function fillPackedTexels(data: Uint8Array, offset: number, texels: number, rgba: readonly number[]): void {
	if ((data.byteOffset + offset) % 4 === 0) {
		// Platform byte order: the 4 bytes are written through a Uint8Array and read back as one 32-bit value.
		const value = new Uint32Array(new Uint8Array(rgba).buffer)[0];
		new Uint32Array(data.buffer, data.byteOffset + offset, texels).fill(value);
		return;
	}

	for (let i = 0, d = offset; i < texels; ++i, d += 4) {
		data[d] = rgba[0];
		data[d + 1] = rgba[1];
		data[d + 2] = rgba[2];
		data[d + 3] = rgba[3];
	}
}

/** Sets one channel of every texel of one layer to `value`. */
function fillPackedChannel(target: ITerrainPackedChannel, value: number): void {
	const { data, texels } = target;
	for (let i = 0, d = target.offset + target.channel; i < texels; ++i, d += 4) {
		data[d] = value;
	}
}

/**
 * Writes `target` from channel `sourceChannel` of `source` (index 0..3 or a TerrainMapChannel), inverted (255 - v) when `invert` is true.
 * luminance = round(0.2126 R + 0.7152 G + 0.0722 B), computed exactly with integers (ties rounded up).
 */
function writePackedChannel(target: ITerrainPackedChannel, source: Uint8Array, sourceChannel: number | TerrainMapChannel, invert: boolean): void {
	const { data, texels } = target;
	let d = target.offset + target.channel;

	if (sourceChannel === "luminance") {
		for (let i = 0, s = 0; i < texels; ++i, d += 4, s += 4) {
			const value = ((2126 * source[s] + 7152 * source[s + 1] + 722 * source[s + 2] + 5000) / 10000) | 0;
			data[d] = invert ? 255 - value : value;
		}
		return;
	}

	const channel = typeof sourceChannel === "number" ? sourceChannel : getTerrainChannelIndex(sourceChannel);
	if (invert) {
		for (let i = 0, s = channel; i < texels; ++i, d += 4, s += 4) {
			data[d] = 255 - source[s];
		}
	} else {
		for (let i = 0, s = channel; i < texels; ++i, d += 4, s += 4) {
			data[d] = source[s];
		}
	}
}

function getTerrainChannelIndex(channel: TerrainMapChannel): number {
	switch (channel) {
		case "g":
			return 1;
		case "b":
			return 2;
		case "a":
			return 3;
		default:
			return 0;
	}
}

/** Levels 1..log2(size) of an RGBA8 array, 2x2 box (a+b+c+d+2)>>2 per channel per layer. */
export function computeTerrainMipChain(level0: Uint8Array, size: number, layers: number): Uint8Array[] {
	const levels: Uint8Array[] = [];
	if (!(size >= 1) || !(layers >= 1) || level0.length < size * size * 4 * layers) {
		return levels;
	}

	let width = size;
	let source = level0;

	while (width > 1) {
		const next = Math.max(1, width >> 1);
		const destination = new Uint8Array(next * next * 4 * layers);

		for (let layer = 0; layer < layers; ++layer) {
			const sourceOffset = layer * width * width * 4;
			const destinationOffset = layer * next * next * 4;

			for (let y = 0; y < next; ++y) {
				const row0 = sourceOffset + Math.min(width - 1, y * 2) * width * 4;
				const row1 = sourceOffset + Math.min(width - 1, y * 2 + 1) * width * 4;

				for (let x = 0; x < next; ++x) {
					const column0 = Math.min(width - 1, x * 2) * 4;
					const column1 = Math.min(width - 1, x * 2 + 1) * 4;
					const d = destinationOffset + (y * next + x) * 4;

					for (let c = 0; c < 4; ++c) {
						destination[d + c] = (source[row0 + column0 + c] + source[row0 + column1 + c] + source[row1 + column0 + c] + source[row1 + column1 + c] + 2) >> 2;
					}
				}
			}
		}

		levels.push(destination);
		source = destination;
		width = next;
	}

	return levels;
}

/** true when some layer reads the ALPHA channel of this source path (height/roughness/AO channel "a"): the decoder is called with { exact: true }. */
export function isTerrainSourceAlphaData(layers: readonly ITerrainLayerData[], path: string): boolean {
	if (!path) {
		return false;
	}

	return layers.some(
		(layer) =>
			(layer.heightMap === path && layer.heightChannel === "a") ||
			(layer.roughnessMap === path && layer.roughnessChannel === "a") ||
			(layer.aoMap === path && layer.aoChannel === "a")
	);
}

/** layerTextureSize scaled by scene.loadingTexturesQuality (high 1, medium 0.5, low/very-low 0.25), min 128. */
export function getTerrainLayerTextureSize(data: Readonly<ITerrainMaterialData>, scene: Scene): number {
	const quality = (scene as unknown as { loadingTexturesQuality?: string } | null)?.loadingTexturesQuality;

	let factor = 1;
	if (quality === "medium") {
		factor = 0.5;
	} else if (quality === "low" || quality === "very-low") {
		factor = 0.25;
	}

	const size = Number.isFinite(data.layerTextureSize) && data.layerTextureSize > 0 ? data.layerTextureSize : 1024;

	return Math.max(128, Math.round(size * factor));
}

/**
 * Cache key of the layer arrays of a material (§5.5.1 step 1): size, anisotropy, rootUrl and the source fields of the rendered layers
 * (the first TERRAIN_MAX_LAYERS). The plugin compares it with the key of its bound entry: same key → nothing to rebuild.
 */
export function getTerrainLayerArrayCacheKey(data: Readonly<ITerrainMaterialData>, rootUrl: string, size: number): string {
	return JSON.stringify([
		size,
		data.anisotropy,
		rootUrl,
		data.layers
			.slice(0, TERRAIN_MAX_LAYERS)
			.map((l) => [l.albedo, l.normal, l.normalConvention, l.roughnessMap, l.roughnessChannel, l.roughnessInvert, l.aoMap, l.aoChannel, l.heightMap, l.heightChannel]),
	]);
}

/** Distinct source paths of the layers, in layer order (albedo, normal, roughness, AO, height). */
export function getTerrainLayerSourcePaths(layers: readonly ITerrainLayerData[]): string[] {
	const paths: string[] = [];
	for (const layer of layers) {
		for (const path of [layer.albedo, layer.normal, layer.roughnessMap, layer.aoMap, layer.heightMap]) {
			if (path && !paths.includes(path)) {
				paths.push(path);
			}
		}
	}

	return paths;
}
