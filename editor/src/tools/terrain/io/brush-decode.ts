import sharp from "sharp";
import { extname } from "path/posix";

import type { ITerrainBrushMask, ITerrainImage } from "../core/types";

/** Message of `toast.brush-exr` (§1.17): EXR files are never decoded as brushes. */
export const TERRAIN_BRUSH_EXR_MESSAGE = "EXR brushes aren't supported: convert them to 16-bit PNG or TIFF.";

/** Mask resolutions accepted by decodeTerrainBrushMask (256 default, 512 for stamps, 64 for thumbnails). */
export const TERRAIN_BRUSH_MIN_RESOLUTION = 2;
export const TERRAIN_BRUSH_MAX_RESOLUTION = 4096;

/** Channel of the brush image read as the mask (§1.9): Rec. 709 luminance of the encoded values, alpha (ensureAlpha) or red. */
export type TerrainBrushChannel = "luminance" | "alpha" | "red";

export interface ITerrainBrushDecodeOptions {
	channel: TerrainBrushChannel;
	/** v → 1 - v, applied to the image only (the letterbox bars stay 0). */
	invert: boolean;
	/** Size of the square mask (fit "contain": aspect preserved, centred, black bars). */
	resolution: number;
}

/**
 * Samples of an image decoded by sharp, IMAGE ORDER (row 0 = top), EXIF orientation applied.
 * 1 channel = gray, 2 = gray + alpha, 3 = RGB, 4 = RGBA.
 */
export interface ITerrainBrushSamples {
	width: number;
	height: number;
	channels: number;
	/** 255 (8-bit sources) or 65535 (16-bit sources). */
	maxValue: number;
	samples: Uint8Array | Uint16Array;
}

/** Rec. 709 luma weights applied to the encoded (non-linearized) values (§6.9). */
const TERRAIN_BRUSH_LUMINANCE_WEIGHTS: readonly [number, number, number] = [0.2126, 0.7152, 0.0722];

/** An alpha channel whose minimum is below this fraction of the maximum value makes a brush default to the alpha channel (§1.9: min alpha < 250). */
const TERRAIN_BRUSH_ALPHA_DETECTION_THRESHOLD = 250 / 255;

/**
 * Returns true when the path names an OpenEXR file (never decoded as a brush, §1.9).
 * @param absolutePath defines the path of the file.
 */
export function isTerrainBrushExrPath(absolutePath: string): boolean {
	return extname(absolutePath.replace(/\\/g, "/")).toLowerCase() === ".exr";
}

/**
 * "alpha" when the image has an alpha channel whose minimum is < 250 (a white shape on a transparent background), else "luminance".
 * Decodes the whole image (sharp stats), so it also rejects files sharp can't read: throws the sharp error, or TERRAIN_BRUSH_EXR_MESSAGE for EXR files.
 * @param absolutePath defines the absolute path of the brush image.
 */
export async function detectTerrainBrushChannel(absolutePath: string): Promise<"luminance" | "alpha"> {
	assertTerrainBrushDecodable(absolutePath);

	const metadata = await sharp(absolutePath).metadata();
	// Throws for sample formats decodeTerrainBrushMask refuses (float, 32-bit integers): such files are rejected when they are added.
	const maxValue = getTerrainBrushBitDepth(metadata.depth) === 16 ? 65535 : 255;

	const stats = await sharp(absolutePath).stats();
	if (!metadata.hasAlpha || stats.channels.length < 2) {
		return "luminance";
	}

	const alpha = stats.channels[stats.channels.length - 1];

	return alpha.min / maxValue < TERRAIN_BRUSH_ALPHA_DETECTION_THRESHOLD ? "alpha" : "luminance";
}

/**
 * Decodes a brush image into a mask (§6.9): 16-bit sources are read as 16-bit, others as 8-bit; the channel is extracted (luminance with the
 * Rec. 709 weights on the encoded values, alpha with ensureAlpha semantics, or red), inverted when asked, then fitted into
 * resolution x resolution (fit "contain": aspect preserved, centred, bars at 0). Values in [0, 1], IMAGE ORDER (row 0 = brush +V).
 * Throws TERRAIN_BRUSH_EXR_MESSAGE for EXR files and the sharp error for unreadable files.
 * @param absolutePath defines the absolute path of the brush image.
 * @param options defines the channel, the inversion and the resolution of the mask.
 */
export async function decodeTerrainBrushMask(absolutePath: string, options: ITerrainBrushDecodeOptions): Promise<ITerrainBrushMask> {
	const resolution = normalizeTerrainBrushResolution(options.resolution);
	const image = await readTerrainBrushSamples(absolutePath);
	const values = extractTerrainBrushValues(image, options.channel, options.invert);

	return {
		width: resolution,
		height: resolution,
		data: fitTerrainBrushValues(values, image.width, image.height, resolution),
	};
}

/**
 * Reads the samples of an image with sharp, keeping 16-bit precision for 16-bit sources (sharp converts to 8-bit sRGB unless the
 * colourspace is forced to grey16/rgb16). EXIF orientation is applied. Throws for EXR files, unsupported sample formats and unreadable files.
 * @param absolutePath defines the absolute path of the image.
 */
export async function readTerrainBrushSamples(absolutePath: string): Promise<ITerrainBrushSamples> {
	assertTerrainBrushDecodable(absolutePath);

	const metadata = await sharp(absolutePath).metadata();
	const bitDepth = getTerrainBrushBitDepth(metadata.depth);
	const inputChannels = metadata.channels ?? 3;

	// "b-w" drops the alpha channel: only single-channel 8-bit images use it.
	let colourspace: "grey16" | "rgb16" | "b-w" | "srgb";
	if (bitDepth === 16) {
		colourspace = inputChannels <= 2 ? "grey16" : "rgb16";
	} else {
		colourspace = inputChannels === 1 && !metadata.hasAlpha ? "b-w" : "srgb";
	}

	// Brush shapes are data: an embedded ICC profile is ignored (sharp would convert the samples through it, §6.9 works on the encoded values).
	const { data, info } = await sharp(absolutePath, { ignoreIcc: true })
		.rotate()
		.toColourspace(colourspace)
		.raw({ depth: bitDepth === 16 ? "ushort" : "uchar" })
		.toBuffer({ resolveWithObject: true });

	const count = info.width * info.height * info.channels;

	let samples: Uint8Array | Uint16Array;
	if (bitDepth === 16) {
		samples = new Uint16Array(count);
		const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
		const littleEndian = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
		for (let i = 0; i < count; ++i) {
			samples[i] = view.getUint16(i * 2, littleEndian);
		}
	} else {
		samples = new Uint8Array(data.buffer, data.byteOffset, count);
	}

	return {
		width: info.width,
		height: info.height,
		channels: info.channels,
		maxValue: bitDepth === 16 ? 65535 : 255,
		samples,
	};
}

/**
 * Returns one value in [0, 1] per pixel (image order) for the given channel: gray images give their gray value for "luminance" and "red",
 * images without alpha give 1 for "alpha" (ensureAlpha). "invert" maps v to 1 - v.
 * @param image defines the samples read by readTerrainBrushSamples.
 * @param channel defines the channel to extract.
 * @param invert defines whether the values are inverted.
 */
export function extractTerrainBrushValues(image: ITerrainBrushSamples, channel: TerrainBrushChannel, invert: boolean): Float32Array {
	const { width, height, channels, samples } = image;
	const count = width * height;
	const scale = 1 / image.maxValue;
	const values = new Float32Array(count);

	const hasAlpha = channels === 2 || channels === 4;
	const isGray = channels <= 2;
	const [wr, wg, wb] = TERRAIN_BRUSH_LUMINANCE_WEIGHTS;

	for (let i = 0; i < count; ++i) {
		const offset = i * channels;

		let value: number;
		if (channel === "alpha") {
			value = hasAlpha ? samples[offset + channels - 1] * scale : 1;
		} else if (channel === "red" || isGray) {
			value = samples[offset] * scale;
		} else {
			value = (wr * samples[offset] + wg * samples[offset + 1] + wb * samples[offset + 2]) * scale;
		}

		value = value > 0 ? (value < 1 ? value : 1) : 0;
		values[i] = invert ? 1 - value : value;
	}

	return values;
}

/**
 * Fits width x height values into a resolution x resolution square (fit "contain"): the image is resampled to cover the square along its
 * largest side (area average when shrinking, linear interpolation when enlarging), centred, and the bars are 0. Image order is preserved.
 * @param values defines the width x height values, image order.
 * @param width defines the width of the source values.
 * @param height defines the height of the source values.
 * @param resolution defines the size of the square output.
 */
export function fitTerrainBrushValues(values: Float32Array, width: number, height: number, resolution: number): Float32Array {
	const output = new Float32Array(resolution * resolution);
	if (width < 1 || height < 1) {
		return output;
	}

	let fitWidth = resolution;
	let fitHeight = resolution;
	if (width > height) {
		fitHeight = Math.max(1, Math.min(resolution, Math.round((resolution * height) / width)));
	} else if (height > width) {
		fitWidth = Math.max(1, Math.min(resolution, Math.round((resolution * width) / height)));
	}

	const resized = resampleTerrainBrushValues(values, width, height, fitWidth, fitHeight);

	const offsetX = Math.floor((resolution - fitWidth) / 2);
	const offsetY = Math.floor((resolution - fitHeight) / 2);
	for (let y = 0; y < fitHeight; ++y) {
		output.set(resized.subarray(y * fitWidth, (y + 1) * fitWidth), (y + offsetY) * resolution + offsetX);
	}

	return output;
}

/**
 * Separable resampling of width x height values to targetWidth x targetHeight: area average (exact box filter for integer ratios) along
 * the axes that shrink, linear interpolation between pixel centres along the axes that grow, identity along the others.
 * @param values defines the source values, row-major.
 * @param width defines the source width.
 * @param height defines the source height.
 * @param targetWidth defines the output width.
 * @param targetHeight defines the output height.
 */
export function resampleTerrainBrushValues(values: Float32Array, width: number, height: number, targetWidth: number, targetHeight: number): Float32Array {
	let current = values;

	if (targetWidth !== width) {
		const taps = createTerrainResampleTaps(width, targetWidth);
		const horizontal = new Float32Array(targetWidth * height);
		for (let y = 0; y < height; ++y) {
			const row = y * width;
			for (let x = 0; x < targetWidth; ++x) {
				let sum = 0;
				for (let t = taps.offsets[x]; t < taps.offsets[x + 1]; ++t) {
					sum += current[row + taps.indices[t]] * taps.weights[t];
				}
				horizontal[y * targetWidth + x] = sum;
			}
		}
		current = horizontal;
	}

	if (targetHeight !== height) {
		const taps = createTerrainResampleTaps(height, targetHeight);
		const vertical = new Float32Array(targetWidth * targetHeight);
		for (let y = 0; y < targetHeight; ++y) {
			for (let t = taps.offsets[y]; t < taps.offsets[y + 1]; ++t) {
				const source = taps.indices[t] * targetWidth;
				const weight = taps.weights[t];
				for (let x = 0; x < targetWidth; ++x) {
					vertical[y * targetWidth + x] += current[source + x] * weight;
				}
			}
		}
		current = vertical;
	}

	if (current === values) {
		return new Float32Array(values);
	}

	for (let i = 0; i < current.length; ++i) {
		const value = current[i];
		current[i] = value > 0 ? (value < 1 ? value : 1) : 0;
	}

	return current;
}

/**
 * 16-bit grayscale PNG (image order) of values 0..1 (captured brushes, §4.16): v → round(clamp01(v) × 65535).
 * @param image defines the image to encode, values in [0, 1], image order.
 */
export async function encodeTerrainBrushPng16(image: ITerrainImage): Promise<Buffer> {
	const { width, height } = assertTerrainBrushImage(image);

	const count = width * height;
	const values = new Uint16Array(count);
	for (let i = 0; i < count; ++i) {
		const value = image.data[i];
		values[i] = Math.round((value > 0 ? (value < 1 ? value : 1) : 0) * 65535);
	}

	return sharp(values, {
		raw: {
			width,
			height,
			channels: 1,
		},
	})
		.toColourspace("grey16")
		.png({ compressionLevel: 6 })
		.toBuffer();
}

/**
 * 8-bit grayscale PNG of a mask (brush thumbnails): v → round(clamp01(v) × 255), image order.
 * @param mask defines the mask (or any image of values in [0, 1]) to encode.
 */
export async function encodeTerrainBrushMaskPng(mask: ITerrainBrushMask | ITerrainImage): Promise<Buffer> {
	const { width, height } = assertTerrainBrushImage(mask);

	const count = width * height;
	const values = new Uint8Array(count);
	for (let i = 0; i < count; ++i) {
		const value = mask.data[i];
		values[i] = Math.round((value > 0 ? (value < 1 ? value : 1) : 0) * 255);
	}

	return sharp(values, {
		raw: {
			width,
			height,
			channels: 1,
		},
	})
		.toColourspace("b-w")
		.png()
		.toBuffer();
}

/**
 * Returns the mask resolution to use: an integer in [2, 4096]; 256 when the value is not a finite number.
 * @param resolution defines the requested resolution.
 */
export function normalizeTerrainBrushResolution(resolution: number): number {
	if (!Number.isFinite(resolution)) {
		return 256;
	}

	return Math.min(TERRAIN_BRUSH_MAX_RESOLUTION, Math.max(TERRAIN_BRUSH_MIN_RESOLUTION, Math.round(resolution)));
}

interface ITerrainResampleTaps {
	/** offsets[o]..offsets[o + 1] - 1 index the taps of output o. */
	offsets: Int32Array;
	indices: Int32Array;
	weights: Float32Array;
}

function createTerrainResampleTaps(source: number, target: number): ITerrainResampleTaps {
	const offsets = new Int32Array(target + 1);
	const indices: number[] = [];
	const weights: number[] = [];

	if (target < source) {
		const scale = source / target;
		for (let o = 0; o < target; ++o) {
			offsets[o] = indices.length;

			const start = o * scale;
			const end = Math.min(source, (o + 1) * scale);
			for (let i = Math.floor(start); i < Math.ceil(end); ++i) {
				const coverage = Math.min(end, i + 1) - Math.max(start, i);
				if (coverage > 0) {
					indices.push(i);
					weights.push(coverage / scale);
				}
			}
		}
	} else {
		const scale = source / target;
		for (let o = 0; o < target; ++o) {
			offsets[o] = indices.length;

			const position = (o + 0.5) * scale - 0.5;
			let index = Math.floor(position);
			let fraction = position - index;
			if (index < 0) {
				index = 0;
				fraction = 0;
			} else if (index >= source - 1) {
				index = source - 1;
				fraction = 0;
			}

			indices.push(index);
			weights.push(1 - fraction);
			if (fraction > 0) {
				indices.push(index + 1);
				weights.push(fraction);
			}
		}
	}

	offsets[target] = indices.length;

	return {
		offsets,
		indices: Int32Array.from(indices),
		weights: Float32Array.from(weights),
	};
}

function getTerrainBrushBitDepth(depth: string | undefined): 8 | 16 {
	switch (depth) {
		case undefined:
		case "uchar":
		case "char":
			return 8;
		case "ushort":
		case "short":
			return 16;
		default:
			throw new Error(`unsupported sample format "${depth}": use an 8-bit or 16-bit image`);
	}
}

function assertTerrainBrushDecodable(absolutePath: string): void {
	if (isTerrainBrushExrPath(absolutePath)) {
		throw new Error(TERRAIN_BRUSH_EXR_MESSAGE);
	}
}

function assertTerrainBrushImage(image: ITerrainImage | ITerrainBrushMask): { width: number; height: number } {
	const width = image?.width;
	const height = image?.height;

	if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || !image.data || image.data.length < width * height) {
		throw new Error("Invalid brush image: expected width x height values.");
	}

	return { width, height };
}
