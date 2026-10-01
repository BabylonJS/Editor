import sharp from "sharp";
import { dirname } from "path/posix";
import { ensureDir, remove, rename, writeFile } from "fs-extra";

import { TERRAIN_LAYERS_PER_WEIGHT_MAP, TERRAIN_WEIGHT_MAP_SIZES, type ITerrainWeightMap } from "babylonjs-editor-tools";

import { toTerrainSlashPath } from "./paths";

/**
 * Encodes a weight map (§6.2): sharp raw RGBA → flip() (texture order → image order) → png({ compressionLevel: 6, palette: false }).
 * usedChannels (1..4) = number of layers stored in this map (layerCount - 4k clamped to 1..4): channels >= usedChannels are written as 255
 * (so alpha stays opaque for 1-3 layers and any image viewer shows the used channels unmodified). The map data is not modified.
 * @param map defines the weight map (RGBA8, texture order: row 0 = local -Z edge).
 * @param usedChannels defines the number of layers stored in the map (clamped to 1..4).
 */
export async function encodeTerrainWeightMapPng(map: ITerrainWeightMap, usedChannels: number): Promise<Buffer> {
	const size = map.size;
	const byteLength = size * size * 4;
	if (!Number.isInteger(size) || size < 1 || !map.data || map.data.length < byteLength) {
		throw new Error(`Invalid terrain weight map: size ${size}, ${map.data?.length ?? 0} bytes.`);
	}

	const used = clampTerrainUsedChannels(usedChannels);

	const pixels = Buffer.alloc(byteLength);
	pixels.set(map.data.subarray(0, byteLength));

	if (used < TERRAIN_LAYERS_PER_WEIGHT_MAP) {
		for (let offset = 0; offset < byteLength; offset += 4) {
			for (let channel = used; channel < 4; ++channel) {
				pixels[offset + channel] = 255;
			}
		}
	}

	return sharp(pixels, {
		raw: {
			width: size,
			height: size,
			channels: 4,
		},
	})
		.flip()
		.png({
			compressionLevel: 6,
			palette: false,
		})
		.toBuffer();
}

/**
 * Encodes then writes the weight map atomically (§6.2): the PNG is written to `${path}.tmp` which is then renamed over the target, so a
 * crash never leaves a truncated PNG. Creates the folder.
 * @param absolutePath defines the absolute path of the PNG file to write.
 * @param map defines the weight map (texture order).
 * @param usedChannels defines the number of layers stored in the map (see encodeTerrainWeightMapPng).
 */
export async function writeTerrainWeightMapFile(absolutePath: string, map: ITerrainWeightMap, usedChannels: number): Promise<void> {
	const path = toTerrainSlashPath(absolutePath);
	const png = await encodeTerrainWeightMapPng(map, usedChannels);

	await ensureDir(dirname(path));

	const temporaryPath = `${path}.tmp`;

	try {
		await writeFile(temporaryPath, png);
		await rename(temporaryPath, path);
	} catch (e) {
		try {
			await remove(temporaryPath);
		} catch (removeError) {
			// Nothing to clean.
		}

		throw e;
	}
}

/**
 * Reads a weight map PNG (§6.2): sharp → flip (image order → texture order) → ensureAlpha → raw RGBA8 → { size: width, data }. Returns
 * null when the file is missing or can't be decoded. A square file is returned at its own size (the weights binding resamples a map
 * whose size differs from data.weightMapSize when it acquires it); a non-square file is resampled (bilinear per channel at the texel
 * centres, §4.10.7) to the smallest of TERRAIN_WEIGHT_MAP_SIZES that is at least its largest side (the largest size otherwise), with a
 * console warning. The returned data is a new array owned by the caller.
 * @param absolutePath defines the absolute path of the PNG file.
 */
export async function readTerrainWeightMapFile(absolutePath: string): Promise<ITerrainWeightMap | null> {
	const path = toTerrainSlashPath(absolutePath);

	let data: Buffer;
	let width: number;
	let height: number;

	try {
		// Weights are data: an embedded ICC profile is ignored (sharp would convert the samples through it).
		const result = await sharp(path, { ignoreIcc: true }).toColourspace("srgb").flip().ensureAlpha().raw({ depth: "uchar" }).toBuffer({ resolveWithObject: true });
		if (result.info.channels !== 4) {
			return null;
		}

		data = result.data;
		width = result.info.width;
		height = result.info.height;
	} catch (e) {
		return null;
	}

	if (width < 1 || height < 1 || data.length < width * height * 4) {
		return null;
	}

	if (width === height) {
		return {
			size: width,
			data: new Uint8Array(data.subarray(0, width * height * 4)),
		};
	}

	const size = getTerrainWeightMapTargetSize(Math.max(width, height));
	console.warn(`[Terrain] ${path}: ${width} x ${height} weight map resampled to ${size} x ${size}.`);

	return {
		size,
		data: resampleTerrainRgbaImage(data, width, height, size),
	};
}

/**
 * Returns the number of layers stored in a weight map, clamped to 1..4 (invalid values give 4).
 * @param usedChannels defines the requested number of channels.
 */
export function clampTerrainUsedChannels(usedChannels: number): number {
	if (!Number.isFinite(usedChannels)) {
		return TERRAIN_LAYERS_PER_WEIGHT_MAP;
	}

	return Math.min(TERRAIN_LAYERS_PER_WEIGHT_MAP, Math.max(1, Math.floor(usedChannels)));
}

function getTerrainWeightMapTargetSize(side: number): number {
	const sizes = TERRAIN_WEIGHT_MAP_SIZES.slice(0).sort((a, b) => a - b);
	return sizes.find((size) => size >= side) ?? sizes[sizes.length - 1];
}

/**
 * Bilinear resampling of an RGBA8 image (any row order, kept) to size x size, sampled at the destination texel centres:
 * source (t + 0.5) × sourceSide / size - 0.5, clamped (§4.10.7).
 */
function resampleTerrainRgbaImage(data: Uint8Array, width: number, height: number, size: number): Uint8Array {
	const result = new Uint8Array(size * size * 4);

	const scaleX = width / size;
	const scaleY = height / size;

	for (let ty = 0; ty < size; ++ty) {
		const sy = Math.min(Math.max((ty + 0.5) * scaleY - 0.5, 0), height - 1);
		const y0 = Math.floor(sy);
		const y1 = Math.min(y0 + 1, height - 1);
		const fy = sy - y0;

		for (let tx = 0; tx < size; ++tx) {
			const sx = Math.min(Math.max((tx + 0.5) * scaleX - 0.5, 0), width - 1);
			const x0 = Math.floor(sx);
			const x1 = Math.min(x0 + 1, width - 1);
			const fx = sx - x0;

			const o00 = (y0 * width + x0) * 4;
			const o10 = (y0 * width + x1) * 4;
			const o01 = (y1 * width + x0) * 4;
			const o11 = (y1 * width + x1) * 4;
			const offset = (ty * size + tx) * 4;

			for (let channel = 0; channel < 4; ++channel) {
				const top = data[o00 + channel] + (data[o10 + channel] - data[o00 + channel]) * fx;
				const bottom = data[o01 + channel] + (data[o11 + channel] - data[o01 + channel]) * fx;
				result[offset + channel] = Math.round(top + (bottom - top) * fy);
			}
		}
	}

	return result;
}
