import { inflateTerrainZlib } from "./inflate";
import type { ITerrainDecodedImage } from "./types";

/** Largest width or height accepted by decodeTerrainPng. */
const TERRAIN_PNG_MAX_DIMENSION = 16384;

const TERRAIN_PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

// Chunk types as big-endian 32-bit integers.
const TERRAIN_PNG_IHDR = 0x49484452;
const TERRAIN_PNG_PLTE = 0x504c5445;
const TERRAIN_PNG_TRNS = 0x74524e53;
const TERRAIN_PNG_IDAT = 0x49444154;
const TERRAIN_PNG_IEND = 0x49454e44;

interface ITerrainPngHeader {
	width: number;
	height: number;
	bitDepth: number;
	colorType: number;
	/** RGB triplets (colour type 3). */
	palette: Uint8Array | null;
	/** tRNS chunk: palette alphas (type 3) or the 16-bit colour key samples (types 0 and 2). */
	transparency: Uint8Array | null;
	/** Concatenated IDAT chunks (zlib stream). */
	compressed: Uint8Array<ArrayBuffer>;
}

/** true when bytes start with the 8-byte PNG signature. */
export function isTerrainPngData(bytes: Uint8Array | null | undefined): boolean {
	if (!bytes || bytes.length < TERRAIN_PNG_SIGNATURE.length) {
		return false;
	}

	return TERRAIN_PNG_SIGNATURE.every((value, index) => bytes[index] === value);
}

/**
 * true when the PNG bytes have an alpha channel: colour type 4 (grey + alpha) or 6 (RGBA), or a tRNS chunk (palette alphas or colour key
 * of types 0, 2 and 3). Cheap: only the chunk headers before the first IDAT are read (tRNS must precede the image data), nothing is
 * inflated. false for anything else: other bytes, a truncated or malformed header.
 */
export function isTerrainPngWithAlpha(bytes: Uint8Array | null | undefined): boolean {
	if (!bytes || !isTerrainPngData(bytes)) {
		return false;
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	let offset = TERRAIN_PNG_SIGNATURE.length;
	let headerRead = false;
	while (offset + 8 <= bytes.length) {
		const length = view.getUint32(offset);
		const type = view.getUint32(offset + 4);
		const dataStart = offset + 8;

		if (!headerRead) {
			// IHDR must come first.
			if (type !== TERRAIN_PNG_IHDR || length !== 13 || dataStart + 13 > bytes.length) {
				return false;
			}

			const colorType = bytes[dataStart + 9];
			if (colorType === 4 || colorType === 6) {
				return true;
			}

			headerRead = true;
		} else if (type === TERRAIN_PNG_TRNS) {
			return true;
		} else if (type === TERRAIN_PNG_IDAT || type === TERRAIN_PNG_IEND) {
			return false;
		}

		if (length > 0x7fffffff) {
			return false;
		}

		offset = dataStart + length + 4;
	}

	return false;
}

/**
 * Byte-exact PNG decoder: color types 0, 2, 3 (PLTE/tRNS), 4, 6; bit depth 8 (16 → high byte); non-interlaced. Output texture order.
 * Inflates with DecompressionStream, else inflateTerrainZlib. null when unsupported or corrupt (never throws).
 * Colour types 0 and 3 also accept bit depths 1, 2 and 4 (grey scaled to 0..255); a tRNS colour key of types 0 and 2 gives alpha 0.
 * Ancillary chunks (iCCP, gAMA, sRGB, cHRM...) are ignored and CRCs are not verified: data textures are never colour managed.
 */
export async function decodeTerrainPng(bytes: Uint8Array): Promise<ITerrainDecodedImage | null> {
	try {
		const header = readTerrainPngChunks(bytes);
		if (!header) {
			return null;
		}

		const inflated = (await inflateWithDecompressionStream(header.compressed)) ?? inflateTerrainZlib(header.compressed);
		if (!inflated) {
			return null;
		}

		return reconstructTerrainPng(header, inflated);
	} catch {
		return null;
	}
}

function readTerrainPngChunks(bytes: Uint8Array): ITerrainPngHeader | null {
	if (!isTerrainPngData(bytes)) {
		return null;
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

	let header: ITerrainPngHeader | null = null;
	let ended = false;
	const idat: Uint8Array[] = [];
	let idatLength = 0;

	let offset = TERRAIN_PNG_SIGNATURE.length;
	while (offset + 8 <= bytes.length) {
		const length = view.getUint32(offset);
		const type = view.getUint32(offset + 4);
		const dataStart = offset + 8;
		const dataEnd = dataStart + length;

		if (length > 0x7fffffff || dataEnd + 4 > bytes.length) {
			return null; // Truncated chunk (the CRC is required, not verified).
		}

		if (!header && type !== TERRAIN_PNG_IHDR) {
			return null; // IHDR must come first.
		}

		switch (type) {
			case TERRAIN_PNG_IHDR:
				if (header || length !== 13) {
					return null;
				}

				header = {
					width: view.getUint32(dataStart),
					height: view.getUint32(dataStart + 4),
					bitDepth: bytes[dataStart + 8],
					colorType: bytes[dataStart + 9],
					palette: null,
					transparency: null,
					compressed: new Uint8Array(0),
				};

				if (bytes[dataStart + 10] !== 0 || bytes[dataStart + 11] !== 0 || bytes[dataStart + 12] !== 0) {
					return null; // Unknown compression or filter method, or interlaced (Adam7): unsupported.
				}
				break;

			case TERRAIN_PNG_PLTE:
				if (length % 3 !== 0 || length === 0 || length > 256 * 3) {
					return null;
				}
				header!.palette = bytes.subarray(dataStart, dataEnd);
				break;

			case TERRAIN_PNG_TRNS:
				header!.transparency = bytes.subarray(dataStart, dataEnd);
				break;

			case TERRAIN_PNG_IDAT:
				idat.push(bytes.subarray(dataStart, dataEnd));
				idatLength += length;
				break;

			case TERRAIN_PNG_IEND:
				ended = true;
				break;
		}

		offset = dataEnd + 4;
		if (ended) {
			break;
		}
	}

	if (!header || !ended || !idatLength || !isSupportedTerrainPngFormat(header)) {
		return null;
	}

	const compressed = new Uint8Array(idatLength);
	for (let i = 0, position = 0; i < idat.length; ++i) {
		compressed.set(idat[i], position);
		position += idat[i].length;
	}

	header.compressed = compressed;
	return header;
}

function isSupportedTerrainPngFormat(header: ITerrainPngHeader): boolean {
	const { width, height, bitDepth, colorType } = header;
	if (!(width >= 1 && height >= 1 && width <= TERRAIN_PNG_MAX_DIMENSION && height <= TERRAIN_PNG_MAX_DIMENSION)) {
		return false;
	}

	switch (colorType) {
		case 0:
			return bitDepth === 1 || bitDepth === 2 || bitDepth === 4 || bitDepth === 8 || bitDepth === 16;
		case 3:
			return (bitDepth === 1 || bitDepth === 2 || bitDepth === 4 || bitDepth === 8) && !!header.palette;
		case 2:
		case 4:
		case 6:
			return bitDepth === 8 || bitDepth === 16;
		default:
			return false;
	}
}

async function inflateWithDecompressionStream(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array | null> {
	if (typeof DecompressionStream !== "function" || typeof Blob !== "function") {
		return null;
	}

	try {
		const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate"));
		const reader = stream.getReader();

		const chunks: Uint8Array[] = [];
		let length = 0;
		for (;;) {
			const { done, value } = await reader.read();
			if (done) {
				break;
			}

			chunks.push(value);
			length += value.length;
		}

		if (chunks.length === 1) {
			return chunks[0];
		}

		const result = new Uint8Array(length);
		for (let i = 0, position = 0; i < chunks.length; ++i) {
			result.set(chunks[i], position);
			position += chunks[i].length;
		}

		return result;
	} catch {
		return null; // Missing, unsupported or failing (corrupt data, Adler-32 mismatch...): the caller falls back to inflateTerrainZlib.
	}
}

function reconstructTerrainPng(header: ITerrainPngHeader, raw: Uint8Array): ITerrainDecodedImage | null {
	const { width, height, bitDepth, colorType } = header;

	const channels = colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 6 ? 4 : 1;
	const bitsPerPixel = channels * bitDepth;
	const rowBytes = Math.ceil((width * bitsPerPixel) / 8);
	const stride = rowBytes + 1;
	const bpp = Math.max(1, bitsPerPixel >> 3);

	if (raw.length < stride * height) {
		return null; // Truncated image data.
	}

	if (!unfilterTerrainPngRows(raw, height, rowBytes, bpp)) {
		return null;
	}

	const data = new Uint8Array(width * height * 4);
	const expand = getTerrainPngRowExpander(header);

	for (let y = 0; y < height; ++y) {
		// Texture order: image row y lands on row height - 1 - y.
		expand(raw, y * stride + 1, data, (height - 1 - y) * width * 4, width);
	}

	return { width, height, data };
}

/** Reverses the 5 PNG filters in place, row by row (filter byte at the start of each row). false for an unknown filter type. */
function unfilterTerrainPngRows(raw: Uint8Array, height: number, rowBytes: number, bpp: number): boolean {
	const stride = rowBytes + 1;

	for (let y = 0; y < height; ++y) {
		const start = y * stride + 1;
		const end = start + rowBytes;

		switch (raw[start - 1]) {
			case 0:
				break;

			case 1:
				for (let i = start + bpp; i < end; ++i) {
					raw[i] += raw[i - bpp];
				}
				break;

			case 2:
				if (y > 0) {
					for (let i = start; i < end; ++i) {
						raw[i] += raw[i - stride];
					}
				}
				break;

			case 3:
				if (y > 0) {
					for (let i = start; i < start + bpp && i < end; ++i) {
						raw[i] += raw[i - stride] >> 1;
					}
					for (let i = start + bpp; i < end; ++i) {
						raw[i] += (raw[i - bpp] + raw[i - stride]) >> 1;
					}
				} else {
					for (let i = start + bpp; i < end; ++i) {
						raw[i] += raw[i - bpp] >> 1;
					}
				}
				break;

			case 4:
				if (y > 0) {
					// Left and upper-left are 0 for the first pixel: the predictor is the upper byte.
					for (let i = start; i < start + bpp && i < end; ++i) {
						raw[i] += raw[i - stride];
					}
					for (let i = start + bpp; i < end; ++i) {
						const a = raw[i - bpp];
						const b = raw[i - stride];
						const c = raw[i - stride - bpp];
						const pa = Math.abs(b - c);
						const pb = Math.abs(a - c);
						const pc = Math.abs(a + b - c - c);
						raw[i] += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
					}
				} else {
					// First row: up and upper-left are 0, Paeth selects the left byte (same as Sub).
					for (let i = start + bpp; i < end; ++i) {
						raw[i] += raw[i - bpp];
					}
				}
				break;

			default:
				return false;
		}
	}

	return true;
}

type TerrainPngRowExpander = (raw: Uint8Array, source: number, data: Uint8Array, destination: number, width: number) => void;

function getTerrainPngRowExpander(header: ITerrainPngHeader): TerrainPngRowExpander {
	const { bitDepth, colorType, transparency } = header;

	switch (colorType) {
		case 6:
			if (bitDepth === 8) {
				return (raw, source, data, destination, width) => data.set(raw.subarray(source, source + width * 4), destination);
			}
			return (raw, source, data, destination, width) => {
				for (let x = 0, s = source, d = destination; x < width; ++x, s += 8, d += 4) {
					data[d] = raw[s];
					data[d + 1] = raw[s + 2];
					data[d + 2] = raw[s + 4];
					data[d + 3] = raw[s + 6];
				}
			};

		case 4:
			if (bitDepth === 8) {
				return (raw, source, data, destination, width) => {
					for (let x = 0, s = source, d = destination; x < width; ++x, s += 2, d += 4) {
						data[d] = data[d + 1] = data[d + 2] = raw[s];
						data[d + 3] = raw[s + 1];
					}
				};
			}
			return (raw, source, data, destination, width) => {
				for (let x = 0, s = source, d = destination; x < width; ++x, s += 4, d += 4) {
					data[d] = data[d + 1] = data[d + 2] = raw[s];
					data[d + 3] = raw[s + 2];
				}
			};

		case 2: {
			const key = transparency && transparency.length >= 6 ? transparency : null;
			if (bitDepth === 8) {
				// The key samples are 16-bit values: only keys whose high bytes are 0 can match 8-bit samples.
				const validKey = !!key && !key[0] && !key[2] && !key[4];
				const keyR = validKey ? key![1] : -1;
				const keyG = validKey ? key![3] : -1;
				const keyB = validKey ? key![5] : -1;
				return (raw, source, data, destination, width) => {
					for (let x = 0, s = source, d = destination; x < width; ++x, s += 3, d += 4) {
						const r = raw[s];
						const g = raw[s + 1];
						const b = raw[s + 2];
						data[d] = r;
						data[d + 1] = g;
						data[d + 2] = b;
						data[d + 3] = r === keyR && g === keyG && b === keyB ? 0 : 255;
					}
				};
			}

			const keyR = key ? (key[0] << 8) | key[1] : -1;
			const keyG = key ? (key[2] << 8) | key[3] : -1;
			const keyB = key ? (key[4] << 8) | key[5] : -1;
			return (raw, source, data, destination, width) => {
				for (let x = 0, s = source, d = destination; x < width; ++x, s += 6, d += 4) {
					data[d] = raw[s];
					data[d + 1] = raw[s + 2];
					data[d + 2] = raw[s + 4];
					const transparent =
						key !== null && ((raw[s] << 8) | raw[s + 1]) === keyR && ((raw[s + 2] << 8) | raw[s + 3]) === keyG && ((raw[s + 4] << 8) | raw[s + 5]) === keyB;
					data[d + 3] = transparent ? 0 : 255;
				}
			};
		}

		case 0: {
			const key = transparency && transparency.length >= 2 ? (transparency[0] << 8) | transparency[1] : -1;
			if (bitDepth === 16) {
				return (raw, source, data, destination, width) => {
					for (let x = 0, s = source, d = destination; x < width; ++x, s += 2, d += 4) {
						data[d] = data[d + 1] = data[d + 2] = raw[s];
						data[d + 3] = ((raw[s] << 8) | raw[s + 1]) === key ? 0 : 255;
					}
				};
			}

			if (bitDepth === 8) {
				return (raw, source, data, destination, width) => {
					for (let x = 0, s = source, d = destination; x < width; ++x, ++s, d += 4) {
						const v = raw[s];
						data[d] = data[d + 1] = data[d + 2] = v;
						data[d + 3] = v === key ? 0 : 255;
					}
				};
			}

			const max = (1 << bitDepth) - 1;
			const scale = 255 / max;
			return (raw, source, data, destination, width) => {
				for (let x = 0, d = destination; x < width; ++x, d += 4) {
					const v = readTerrainPngPackedSample(raw, source, x, bitDepth);
					data[d] = data[d + 1] = data[d + 2] = v * scale;
					data[d + 3] = v === key ? 0 : 255;
				}
			};
		}

		default: {
			// Colour type 3: palette + optional tRNS alphas (missing entries are opaque, out-of-range indices opaque black).
			const palette = header.palette!;
			const lookup = new Uint8Array(256 * 4);
			for (let i = 0; i < 256; ++i) {
				const inPalette = i * 3 + 2 < palette.length;
				lookup[i * 4] = inPalette ? palette[i * 3] : 0;
				lookup[i * 4 + 1] = inPalette ? palette[i * 3 + 1] : 0;
				lookup[i * 4 + 2] = inPalette ? palette[i * 3 + 2] : 0;
				lookup[i * 4 + 3] = inPalette && transparency && i < transparency.length ? transparency[i] : 255;
			}

			return (raw, source, data, destination, width) => {
				for (let x = 0, d = destination; x < width; ++x, d += 4) {
					const index = (bitDepth === 8 ? raw[source + x] : readTerrainPngPackedSample(raw, source, x, bitDepth)) * 4;
					data[d] = lookup[index];
					data[d + 1] = lookup[index + 1];
					data[d + 2] = lookup[index + 2];
					data[d + 3] = lookup[index + 3];
				}
			};
		}
	}
}

/** Sample x of a row of 1, 2 or 4-bit samples (most significant bits first). */
function readTerrainPngPackedSample(raw: Uint8Array, source: number, x: number, bitDepth: number): number {
	const bit = x * bitDepth;
	return (raw[source + (bit >> 3)] >> (8 - bitDepth - (bit & 7))) & ((1 << bitDepth) - 1);
}
