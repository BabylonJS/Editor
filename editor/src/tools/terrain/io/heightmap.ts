import sharp from "sharp";
import { basename, dirname, extname } from "path/posix";
import { ensureDir, pathExists, readFile, readJSON, writeFile, writeJSON } from "fs-extra";

import type { Mesh } from "babylonjs";

import type { Editor } from "../../../editor/main";

import type { ITerrainImage } from "../core/types";
import { getTerrainMeshHeightImage } from "../engine/info";
import { replaceTerrainHeights } from "../engine/operations";
import type { ITerrainHeightImportOptions } from "../engine/types";
import { whenTerrainIdleAsync } from "../engine/yield";

import { toTerrainAbsolutePath, toTerrainSlashPath } from "./paths";

export interface ITerrainHeightmapFile extends ITerrainImage {
	bitDepth: 8 | 16;
}

export interface ITerrainHeightmapSidecar {
	minHeight: number;
	maxHeight: number;
	width: number;
	height: number;
	flipY: boolean;
}

/**
 * Pixels of an image file decoded by sharp, row 0 = top of the image, `channels` interleaved samples per pixel (normalized 0..1 by the
 * caller with `maxValue`). Single-channel grayscale files keep 1 channel; every other file (grayscale with alpha included) is converted
 * to sRGB: 3 channels, or 4 with alpha.
 */
export interface ITerrainDecodedImageFile {
	width: number;
	height: number;
	channels: number;
	/** Whether the last channel is an alpha channel. */
	hasAlpha: boolean;
	bitDepth: 8 | 16;
	/** 255 or 65535. */
	maxValue: number;
	samples: Uint8Array | Uint16Array;
}

/** Message thrown by importTerrainHeightmap when no height range is given and no sidecar exists (§3.6). */
export const TERRAIN_HEIGHTMAP_NO_RANGE_MESSAGE = "No height range: pass minHeight and maxHeight (no sidecar found).";

/** Rec. 709 luminance weights applied to the encoded RGB values (§4.12). */
const LUMINANCE_R = 0.2126;
const LUMINANCE_G = 0.7152;
const LUMINANCE_B = 0.0722;

/**
 * Returns whether or not the given path is a RAW 16-bit heightmap (".raw" or ".r16").
 * @param path defines the path of the file.
 */
export function isTerrainRawHeightmapPath(path: string): boolean {
	const extension = extname(toTerrainSlashPath(path)).toLowerCase();
	return extension === ".raw" || extension === ".r16";
}

/**
 * Returns the path of the JSON sidecar written next to an exported heightmap: `${absolutePath}.heightmap.json`.
 * @param absolutePath defines the absolute path of the heightmap.
 */
export function getTerrainHeightmapSidecarPath(absolutePath: string): string {
	return `${toTerrainAbsolutePath(absolutePath)}.heightmap.json`;
}

/**
 * Reads a heightmap (§4.12): 8/16-bit PNG, TIFF, JPG (and any other format sharp decodes) or RAW16 (".raw"/".r16", little-endian uint16,
 * row 0 = top). Values: 16-bit / 65535, 8-bit / 255, RGB → luminance (0.2126, 0.7152, 0.0722) on the encoded values, alpha ignored.
 * The image is returned in image order (row 0 = top = +Z edge), unflipped. The RAW size is rawWidth x rawHeight, else
 * sqrt(bytes / 2) squared when it is an integer. Throws when the file can't be read or decoded.
 * @param absolutePath defines the absolute path of the heightmap (a project-relative path is resolved against the project directory).
 * @param options defines the size of a RAW file (both optional; one of them is enough when the other can be derived).
 */
export async function readTerrainHeightmapFile(absolutePath: string, options?: { rawWidth?: number; rawHeight?: number }): Promise<ITerrainHeightmapFile> {
	const path = toTerrainAbsolutePath(absolutePath);

	if (isTerrainRawHeightmapPath(path)) {
		const bytes = await readFile(path);
		return decodeTerrainRaw16Heightmap(bytes, options?.rawWidth, options?.rawHeight);
	}

	const file = await readTerrainImageFile(path);
	return {
		width: file.width,
		height: file.height,
		bitDepth: file.bitDepth,
		data: getTerrainImageLuminance(file, false),
	};
}

/**
 * Decodes RAW 16-bit heightmap bytes (little-endian uint16, row 0 = top) into values 0..1.
 * @param bytes defines the content of the file.
 * @param rawWidth defines the width in pixels (optional when it can be derived).
 * @param rawHeight defines the height in pixels (optional when it can be derived).
 */
export function decodeTerrainRaw16Heightmap(bytes: Uint8Array, rawWidth?: number, rawHeight?: number): ITerrainHeightmapFile {
	if (bytes.length === 0) {
		throw new Error("The RAW heightmap is empty.");
	}

	if (bytes.length % 2 !== 0) {
		throw new Error(`The RAW heightmap has an odd number of bytes (${bytes.length}): it is not a 16-bit RAW file.`);
	}

	const count = bytes.length / 2;

	let width = isPositiveInteger(rawWidth) ? rawWidth : 0;
	let height = isPositiveInteger(rawHeight) ? rawHeight : 0;

	if (!width && !height) {
		const side = Math.round(Math.sqrt(count));
		if (side * side !== count) {
			throw new Error(`The size of the RAW heightmap can't be inferred from ${bytes.length} bytes: pass rawWidth and rawHeight.`);
		}

		width = side;
		height = side;
	} else if (!width) {
		width = count / height;
	} else if (!height) {
		height = count / width;
	}

	if (!Number.isInteger(width) || !Number.isInteger(height) || width * height !== count) {
		throw new Error(`The RAW heightmap has ${bytes.length} bytes: ${width} x ${height} 16-bit pixels need ${width * height * 2} bytes.`);
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const data = new Float32Array(count);
	for (let i = 0; i < count; ++i) {
		data[i] = view.getUint16(i * 2, true) / 65535;
	}

	return {
		width,
		height,
		bitDepth: 16,
		data,
	};
}

/**
 * Reads `${absolutePath}.heightmap.json` (written by writeTerrainHeightmapFile). Returns null when it is missing or invalid (minHeight and
 * maxHeight must be finite numbers). width/height default to 0 (unknown) and flipY to false when absent.
 * @param absolutePath defines the absolute path of the heightmap (not of the sidecar).
 */
export async function readTerrainHeightmapSidecar(absolutePath: string): Promise<ITerrainHeightmapSidecar | null> {
	const sidecarPath = getTerrainHeightmapSidecarPath(absolutePath);

	try {
		if (!(await pathExists(sidecarPath))) {
			return null;
		}

		return parseTerrainHeightmapSidecar(await readJSON(sidecarPath, { encoding: "utf-8" }));
	} catch (e) {
		return null;
	}
}

/**
 * Validates the content of a heightmap sidecar; null when invalid.
 * @param value defines the parsed JSON.
 */
export function parseTerrainHeightmapSidecar(value: unknown): ITerrainHeightmapSidecar | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}

	const data = value as Record<string, unknown>;
	if (!isFiniteNumber(data.minHeight) || !isFiniteNumber(data.maxHeight)) {
		return null;
	}

	if ((data.width !== undefined && !isNonNegativeInteger(data.width)) || (data.height !== undefined && !isNonNegativeInteger(data.height))) {
		return null;
	}

	if (data.flipY !== undefined && typeof data.flipY !== "boolean") {
		return null;
	}

	return {
		minHeight: data.minHeight,
		maxHeight: data.maxHeight,
		width: (data.width as number | undefined) ?? 0,
		height: (data.height as number | undefined) ?? 0,
		flipY: (data.flipY as boolean | undefined) ?? false,
	};
}

/**
 * Writes the heightmap (§4.12) and its sidecar `${absolutePath}.heightmap.json` ({ minHeight, maxHeight, width, height, flipY: false }).
 * png16: 16-bit grayscale PNG; raw16: little-endian uint16, row 0 = top. Values are clamped to 0..1 and scaled to 0..65535. Creates the folder.
 * @param absolutePath defines the absolute path of the heightmap file (a project-relative path is resolved against the project directory).
 * @param image defines the heights normalized to 0..1, image order (row 0 = +Z edge).
 * @param format defines the file format.
 * @param range defines the world heights (cm) of black (minWorld) and white (maxWorld), written in the sidecar.
 */
export async function writeTerrainHeightmapFile(
	absolutePath: string,
	image: ITerrainImage,
	format: "png16" | "raw16",
	range: { minWorld: number; maxWorld: number }
): Promise<void> {
	const width = image.width;
	const height = image.height;
	const count = width * height;

	if (!isPositiveInteger(width) || !isPositiveInteger(height) || !image.data || image.data.length < count) {
		throw new Error(`Invalid heightmap image: ${width} x ${height}, ${image.data?.length ?? 0} values.`);
	}

	if (!isFiniteNumber(range.minWorld) || !isFiniteNumber(range.maxWorld)) {
		throw new Error("The height range of the heightmap must be finite numbers.");
	}

	if (format !== "png16" && format !== "raw16") {
		throw new Error(`Unsupported heightmap format "${format}".`);
	}

	const values = new Uint16Array(count);
	for (let i = 0; i < count; ++i) {
		const v = image.data[i];
		values[i] = Math.round((v > 0 ? (v < 1 ? v : 1) : 0) * 65535);
	}

	let content: Buffer;
	if (format === "raw16") {
		content = Buffer.alloc(count * 2);
		for (let i = 0; i < count; ++i) {
			content.writeUInt16LE(values[i], i * 2);
		}
	} else {
		content = await sharp(values, {
			raw: {
				width,
				height,
				channels: 1,
			},
		})
			.toColourspace("grey16")
			.png()
			.toBuffer();
	}

	const path = toTerrainAbsolutePath(absolutePath);
	await ensureDir(dirname(path));
	await writeFile(path, content);

	const sidecar: ITerrainHeightmapSidecar = {
		minHeight: range.minWorld,
		maxHeight: range.maxWorld,
		width,
		height,
		flipY: false,
	};

	await writeJSON(getTerrainHeightmapSidecarPath(path), sidecar, {
		spaces: "\t",
		encoding: "utf-8",
	});
}

/**
 * Heightmap read for an import (readTerrainHeightmapImport): the decoded image and the import options resolved with the sidecar defaults.
 */
export interface ITerrainHeightmapImport {
	/** Decoded values 0..1 in image order (replaceTerrainHeights flips them when flipY is true). */
	image: ITerrainImage;
	bitDepth: 8 | 16;
	minWorld: number;
	maxWorld: number;
	flipY: boolean;
}

/**
 * Options of readTerrainHeightmapImport: omitted (or null) values default to the sidecar `<file>.heightmap.json`.
 */
export interface ITerrainHeightmapImportReadOptions {
	/** World height (cm) of black; default: the sidecar's minHeight. */
	minWorld?: number | null;
	/** World height (cm) of white; default: the sidecar's maxHeight. */
	maxWorld?: number | null;
	/** Default: the sidecar's flipY, else false. */
	flipY?: boolean;
	/** Size of a RAW file; default: the sidecar's width and height (when neither is given). */
	rawWidth?: number;
	rawHeight?: number;
}

/**
 * Reads and decodes a heightmap to import (§4.12) without applying anything: minWorld/maxWorld default to the sidecar's minHeight/maxHeight
 * when omitted (throws TERRAIN_HEIGHTMAP_NO_RANGE_MESSAGE when neither exists), flipY defaults to the sidecar's flipY (else false) and the size
 * of a RAW file to the sidecar's width/height when rawWidth/rawHeight are omitted. Shared by importTerrainHeightmap and the MCP tool
 * import_terrain_heightmap, which reads the file before its mutation.
 * @param absolutePath defines the absolute path of the heightmap, read in place: it doesn't need to be inside the project (a
 * project-relative path is resolved against the project directory).
 * @param options defines the height range (world cm of black and white), the vertical flip and the RAW size.
 */
export async function readTerrainHeightmapImport(absolutePath: string, options: ITerrainHeightmapImportReadOptions = {}): Promise<ITerrainHeightmapImport> {
	const path = toTerrainAbsolutePath(absolutePath);
	const sidecar = await readTerrainHeightmapSidecar(path);

	// null (JavaScript callers) is treated like an omitted bound.
	const minWorld = typeof options.minWorld === "number" ? options.minWorld : sidecar?.minHeight;
	const maxWorld = typeof options.maxWorld === "number" ? options.maxWorld : sidecar?.maxHeight;
	if (minWorld === undefined || maxWorld === undefined) {
		throw new Error(TERRAIN_HEIGHTMAP_NO_RANGE_MESSAGE);
	}

	if (!isFiniteNumber(minWorld) || !isFiniteNumber(maxWorld)) {
		throw new Error("The height range of the heightmap must be finite numbers.");
	}

	let rawWidth = options.rawWidth;
	let rawHeight = options.rawHeight;
	if (!isPositiveInteger(rawWidth) && !isPositiveInteger(rawHeight) && sidecar && sidecar.width > 0 && sidecar.height > 0) {
		rawWidth = sidecar.width;
		rawHeight = sidecar.height;
	}

	let file: ITerrainHeightmapFile;
	try {
		file = await readTerrainHeightmapFile(path, { rawWidth, rawHeight });
	} catch (e) {
		throw new Error(`Can't read the heightmap "${basename(path)}": ${getErrorMessage(e)}`);
	}

	return {
		image: {
			width: file.width,
			height: file.height,
			data: file.data,
		},
		bitDepth: file.bitDepth,
		minWorld,
		maxWorld,
		flipY: options.flipY ?? sidecar?.flipY ?? false,
	};
}

/**
 * Imports a heightmap into a terrain (§1.13.4, §4.12) through replaceTerrainHeights (one undo entry). minWorld/maxWorld default to the
 * sidecar's minHeight/maxHeight when omitted; throws "No height range: pass minHeight and maxHeight (no sidecar found)." when neither exists.
 * flipY defaults to the sidecar's flipY (else false); the size of a RAW file defaults to the sidecar's width/height when rawWidth/rawHeight
 * are omitted (readTerrainHeightmapImport). The image is passed in image order: replaceTerrainHeights flips it when flipY is true.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 * @param absolutePath defines the absolute path of the heightmap, read in place: it doesn't need to be inside the project (a
 * project-relative path is resolved against the project directory).
 * @param options defines the height range (world cm of black and white), the mode, the vertical flip and the RAW size.
 */
export async function importTerrainHeightmap(
	editor: Editor,
	mesh: Mesh,
	absolutePath: string,
	options: Partial<Pick<ITerrainHeightImportOptions, "minWorld" | "maxWorld">> &
		Omit<ITerrainHeightImportOptions, "minWorld" | "maxWorld"> & { rawWidth?: number; rawHeight?: number }
): Promise<{ minWorld: number; maxWorld: number; bitDepth: 8 | 16 }> {
	const heightmap = await readTerrainHeightmapImport(absolutePath, options);

	await replaceTerrainHeights(editor, mesh, heightmap.image, {
		minWorld: heightmap.minWorld,
		maxWorld: heightmap.maxWorld,
		mode: options.mode ?? "replace",
		flipY: heightmap.flipY,
	});

	return {
		minWorld: heightmap.minWorld,
		maxWorld: heightmap.maxWorld,
		bitDepth: heightmap.bitDepth,
	};
}

/**
 * Exports the heights of a terrain (§1.13.5, §4.12): (S+1) x (S+1) image normalized to the terrain's world height range (a flat terrain
 * gets maxWorld = minWorld + 1), 16-bit PNG or RAW16, plus the sidecar `${absolutePath}.heightmap.json`. Waits for the running terrain
 * operations first. Doesn't toast: callers report the returned range ("Heightmap exported ({min}–{max} cm)").
 * @param mesh defines the terrain.
 * @param absolutePath defines the absolute path of the file to write (a project-relative path is resolved against the project directory).
 * @param format defines the file format.
 */
export async function exportTerrainHeightmap(mesh: Mesh, absolutePath: string, format: "png16" | "raw16"): Promise<{ minWorld: number; maxWorld: number }> {
	await whenTerrainIdleAsync();

	const { image, minWorld, maxWorld } = getTerrainMeshHeightImage(mesh);
	await writeTerrainHeightmapFile(absolutePath, image, format, { minWorld, maxWorld });

	return {
		minWorld,
		maxWorld,
	};
}

/**
 * Decodes an image file with sharp without changing its pixel order (no EXIF rotation): 8-bit files as uchar, 16-bit files as ushort,
 * single-channel grayscale files as 1 channel, every other file converted to sRGB (3 channels, 4 with alpha: gray + alpha files become
 * RGBA because sharp drops the alpha of 8-bit grayscale raw output). Throws for unsupported sample formats (float, 32-bit integers) and
 * unreadable files.
 * @param absolutePath defines the absolute path of the image.
 */
export async function readTerrainImageFile(absolutePath: string): Promise<ITerrainDecodedImageFile> {
	const path = toTerrainAbsolutePath(absolutePath);
	const metadata = await sharp(path).metadata();

	let bitDepth: 8 | 16;
	switch (metadata.depth) {
		case "uchar":
		case "char":
		case undefined:
			bitDepth = 8;
			break;
		case "ushort":
		case "short":
			bitDepth = 16;
			break;
		default:
			throw new Error(`unsupported sample format "${metadata.depth}": use an 8-bit or 16-bit image.`);
	}

	const singleChannel = metadata.channels === 1;
	const colourspace = singleChannel ? (bitDepth === 16 ? "grey16" : "b-w") : bitDepth === 16 ? "rgb16" : "srgb";

	// Heights are data: an embedded ICC profile is ignored (sharp would convert the samples through it, §4.12 works on the encoded values).
	const { data, info } = await sharp(path, { ignoreIcc: true })
		.toColourspace(colourspace)
		.raw({ depth: bitDepth === 16 ? "ushort" : "uchar" })
		.toBuffer({ resolveWithObject: true });

	const channels = info.channels;
	const count = info.width * info.height;

	let samples: Uint8Array | Uint16Array;
	if (bitDepth === 16) {
		samples = new Uint16Array(count * channels);
		const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
		const littleEndian = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
		for (let i = 0; i < samples.length; ++i) {
			samples[i] = view.getUint16(i * 2, littleEndian);
		}
	} else {
		samples = new Uint8Array(data.subarray(0, count * channels));
	}

	return {
		width: info.width,
		height: info.height,
		channels,
		hasAlpha: channels === 2 || channels === 4,
		bitDepth,
		maxValue: bitDepth === 16 ? 65535 : 255,
		samples,
	};
}

/**
 * Returns one value 0..1 per pixel (image order): the gray channel of grayscale images, the luminance (0.2126, 0.7152, 0.0722) of the
 * encoded RGB values otherwise. When multiplyByAlpha is true, the value is multiplied by the alpha channel (transparent = 0).
 * @param file defines the decoded image.
 * @param multiplyByAlpha defines whether or not the alpha channel (when present) multiplies the value.
 */
export function getTerrainImageLuminance(file: ITerrainDecodedImageFile, multiplyByAlpha: boolean): Float32Array {
	const count = file.width * file.height;
	const channels = file.channels;
	const samples = file.samples;
	const scale = 1 / file.maxValue;
	const alphaChannel = file.hasAlpha && multiplyByAlpha ? channels - 1 : -1;

	const data = new Float32Array(count);
	for (let i = 0, offset = 0; i < count; ++i, offset += channels) {
		let value = channels >= 3 ? LUMINANCE_R * samples[offset] + LUMINANCE_G * samples[offset + 1] + LUMINANCE_B * samples[offset + 2] : samples[offset];
		if (alphaChannel !== -1) {
			value *= samples[offset + alphaChannel] * scale;
		}

		value *= scale;
		data[i] = value > 0 ? (value < 1 ? value : 1) : 0;
	}

	return data;
}

function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

function isPositiveInteger(value: unknown): value is number {
	return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
	return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
