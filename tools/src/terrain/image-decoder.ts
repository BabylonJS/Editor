import type { Scene } from "@babylonjs/core/scene";

import { decodeTerrainPng, isTerrainPngData, isTerrainPngWithAlpha } from "./png";
import type { ITerrainDecodedImage, ITerrainImageDecodeOptions, ITerrainImageDecoder } from "./types";

type TerrainCanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Default decoder of the layer sources (§5.5.1): loads the file through Babylon's file loading (offline provider, request overrides,
 * `file:` in Electron) then decodes it with decodeTerrainLayerSourceBytes. null on failure (never throws).
 */
export class BrowserTerrainImageDecoder implements ITerrainImageDecoder {
	public async decode(url: string, width: number, height: number, scene: Scene, options?: ITerrainImageDecodeOptions): Promise<ITerrainDecodedImage | null> {
		try {
			const data: unknown = await scene._loadFileAsync(url, undefined, true, true);
			if (data instanceof ArrayBuffer) {
				return await decodeTerrainLayerSourceBytes(new Uint8Array(data), width, height, options);
			}

			if (ArrayBuffer.isView(data)) {
				return await decodeTerrainLayerSourceBytes(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), width, height, options);
			}

			return null;
		} catch {
			return null;
		}
	}
}

/**
 * Decodes the bytes of a layer source to width x height RGBA8 in texture order (§5.5.1), the same way in games and in the editor:
 * - PNG bytes with an alpha channel (colour type 4 or 6, or a tRNS chunk: isTerrainPngWithAlpha), or any PNG bytes with options.exact:
 *   decodeTerrainPng (exact, straight alpha), then resizeTerrainImage when the size differs. A 2D canvas stores premultiplied colours:
 *   it would damage the RGB of low-alpha texels even when no layer reads the alpha (a normal map with a height in alpha used as a normal
 *   map only, an albedo with a smoothness in alpha). PNG variants the exact decoder doesn't support (interlaced files) fall back to the
 *   browser decode;
 * - otherwise decodeTerrainImageBytes (createImageBitmap + canvas, rows flipped in JS). Non-PNG sources with alpha (WebP) keep that path.
 * null on failure (never throws).
 */
export async function decodeTerrainLayerSourceBytes(bytes: Uint8Array, width: number, height: number, options?: ITerrainImageDecodeOptions): Promise<ITerrainDecodedImage | null> {
	try {
		if (isTerrainPngData(bytes) && (options?.exact || isTerrainPngWithAlpha(bytes))) {
			const image = await decodeTerrainPng(bytes);
			if (image) {
				return image.width === width && image.height === height ? image : resizeTerrainImage(image, width, height);
			}
		}

		return await decodeTerrainImageBlobPart(bytes, width, height);
	} catch {
		return null;
	}
}

/**
 * createImageBitmap(blob, { resizeWidth, resizeHeight, resizeQuality: "high", premultiplyAlpha: "none", colorSpaceConversion: "none" }) (NO imageOrientation)
 * + OffscreenCanvas getImageData, then rows flipped in JS to texture order. width/height null = natural size. null on failure.
 */
export async function decodeTerrainImageBytes(bytes: ArrayBuffer, width: number | null, height: number | null): Promise<ITerrainDecodedImage | null> {
	return decodeTerrainImageBlobPart(bytes, width, height);
}

async function decodeTerrainImageBlobPart(bytes: ArrayBuffer | Uint8Array, width: number | null, height: number | null): Promise<ITerrainDecodedImage | null> {
	if (typeof createImageBitmap !== "function" || typeof Blob !== "function") {
		return null;
	}

	let bitmap: ImageBitmap | null = null;
	try {
		// imageOrientation "flipY" is deliberately not used: unsupported dictionary members are silently ignored by some browsers.
		const options: ImageBitmapOptions = { premultiplyAlpha: "none", colorSpaceConversion: "none" };
		if (width !== null) {
			options.resizeWidth = width;
		}
		if (height !== null) {
			options.resizeHeight = height;
		}
		if (width !== null || height !== null) {
			options.resizeQuality = "high";
		}

		bitmap = await createImageBitmap(new Blob([bytes as BlobPart]), options);

		const imageWidth = bitmap.width;
		const imageHeight = bitmap.height;
		if (!imageWidth || !imageHeight) {
			return null;
		}

		const context = createTerrainCanvasContext(imageWidth, imageHeight);
		if (!context) {
			return null;
		}

		context.drawImage(bitmap, 0, 0);
		const imageData = context.getImageData(0, 0, imageWidth, imageHeight);
		const data = new Uint8Array(imageData.data.buffer, imageData.data.byteOffset, imageData.data.byteLength);

		flipTerrainImageRowsInPlace(data, imageWidth, imageHeight);

		return { width: imageWidth, height: imageHeight, data };
	} catch {
		return null;
	} finally {
		bitmap?.close();
	}
}

function createTerrainCanvasContext(width: number, height: number): TerrainCanvasContext | null {
	if (typeof OffscreenCanvas === "function") {
		const context = new OffscreenCanvas(width, height).getContext("2d", { willReadFrequently: true });
		if (context) {
			return context;
		}
	}

	if (typeof document !== "undefined" && typeof document.createElement === "function") {
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		return canvas.getContext("2d", { willReadFrequently: true });
	}

	return null;
}

interface ITerrainResizeAxis {
	/** First source index contributing to each destination index. */
	first: Int32Array;
	/** Number of contributing source indices per destination index. */
	count: Int32Array;
	/** Offset of the first weight of each destination index in `weights`. */
	offset: Int32Array;
	/** Normalized coverage weights. */
	weights: Float64Array;
}

/**
 * Coverage weights of one axis: destination index d covers the source interval [d s/n, (d + 1) s/n); every source index contributes its
 * covered length, normalized so the weights of d sum to 1 (exact 1/r weights for integer ratios r).
 */
function computeTerrainResizeAxis(source: number, destination: number): ITerrainResizeAxis {
	const ratio = source / destination;

	const first = new Int32Array(destination);
	const count = new Int32Array(destination);
	const offset = new Int32Array(destination);
	const weights: number[] = [];

	for (let d = 0; d < destination; ++d) {
		const begin = d * ratio;
		const end = (d + 1) * ratio;
		const from = Math.min(source - 1, Math.floor(begin));
		const to = Math.min(source - 1, Math.max(from, Math.ceil(end) - 1));

		offset[d] = weights.length;

		let total = 0;
		let start = -1;
		for (let s = from; s <= to; ++s) {
			const coverage = Math.min(s + 1, end) - Math.max(s, begin);
			if (coverage <= 1e-9) {
				continue;
			}

			if (start < 0) {
				start = s;
			} else if (s !== start + weights.length - offset[d]) {
				break; // Contributions are contiguous.
			}

			weights.push(coverage);
			total += coverage;
		}

		if (start < 0) {
			start = from;
			weights.push(1);
			total = 1;
		}

		first[d] = start;
		count[d] = weights.length - offset[d];
		for (let i = offset[d]; i < weights.length; ++i) {
			weights[i] /= total;
		}
	}

	return { first, count, offset, weights: new Float64Array(weights) };
}

/** Area-average (box) resampling of an RGBA8 image to width x height (exact for integer ratios; bilinear-weighted coverage otherwise). Row order preserved. */
export function resizeTerrainImage(image: ITerrainDecodedImage, width: number, height: number): ITerrainDecodedImage {
	const sourceWidth = image.width;
	const sourceHeight = image.height;
	const source = image.data;

	if (width === sourceWidth && height === sourceHeight) {
		return { width, height, data: source.slice(0, width * height * 4) };
	}

	if (!(width >= 1 && height >= 1 && sourceWidth >= 1 && sourceHeight >= 1) || source.length < sourceWidth * sourceHeight * 4) {
		return { width: Math.max(0, width | 0), height: Math.max(0, height | 0), data: new Uint8Array(Math.max(0, width | 0) * Math.max(0, height | 0) * 4) };
	}

	const xAxis = computeTerrainResizeAxis(sourceWidth, width);
	const yAxis = computeTerrainResizeAxis(sourceHeight, height);

	const rowSize = width * 4;
	const data = new Uint8Array(rowSize * height);
	const accumulator = new Float64Array(rowSize);

	// Two cached horizontally resampled source rows: consecutive destination rows share at most their boundary rows.
	const cachedRows = [new Float64Array(rowSize), new Float64Array(rowSize)];
	const cachedIndices = [-1, -1];
	let nextSlot = 0;

	const getHorizontalRow = (sourceY: number): Float64Array => {
		for (let slot = 0; slot < 2; ++slot) {
			if (cachedIndices[slot] === sourceY) {
				return cachedRows[slot];
			}
		}

		const slot = nextSlot;
		nextSlot = 1 - nextSlot;
		cachedIndices[slot] = sourceY;

		const row = cachedRows[slot];
		const sourceRow = sourceY * sourceWidth * 4;

		for (let x = 0; x < width; ++x) {
			let r = 0;
			let g = 0;
			let b = 0;
			let a = 0;

			const offset = xAxis.offset[x];
			for (let k = 0, s = sourceRow + xAxis.first[x] * 4; k < xAxis.count[x]; ++k, s += 4) {
				const w = xAxis.weights[offset + k];
				r += source[s] * w;
				g += source[s + 1] * w;
				b += source[s + 2] * w;
				a += source[s + 3] * w;
			}

			const d = x * 4;
			row[d] = r;
			row[d + 1] = g;
			row[d + 2] = b;
			row[d + 3] = a;
		}

		return row;
	};

	for (let y = 0; y < height; ++y) {
		accumulator.fill(0);

		const offset = yAxis.offset[y];
		for (let k = 0; k < yAxis.count[y]; ++k) {
			const w = yAxis.weights[offset + k];
			const row = getHorizontalRow(yAxis.first[y] + k);
			for (let i = 0; i < rowSize; ++i) {
				accumulator[i] += row[i] * w;
			}
		}

		const destination = y * rowSize;
		for (let i = 0; i < rowSize; ++i) {
			data[destination + i] = Math.min(255, Math.max(0, Math.round(accumulator[i])));
		}
	}

	return { width, height, data };
}

/** Reverses the row order of an RGBA8 buffer in place (image order ↔ texture order). */
export function flipTerrainImageRowsInPlace(data: Uint8Array, width: number, height: number): void {
	const rowSize = width * 4;
	if (rowSize <= 0 || height <= 1) {
		return;
	}

	if (data.length < rowSize * height) {
		throw new RangeError(`flipTerrainImageRowsInPlace: ${data.length} bytes can't hold ${width} x ${height} RGBA8 texels.`);
	}

	const temporary = new Uint8Array(rowSize);
	for (let top = 0, bottom = height - 1; top < bottom; ++top, --bottom) {
		const topStart = top * rowSize;
		const bottomStart = bottom * rowSize;

		temporary.set(data.subarray(topStart, topStart + rowSize));
		data.copyWithin(topStart, bottomStart, bottomStart + rowSize);
		data.set(temporary, bottomStart);
	}
}
