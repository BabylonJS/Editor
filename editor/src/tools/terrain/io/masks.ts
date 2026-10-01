import sharp from "sharp";
import { basename, dirname, extname } from "path/posix";
import { ensureDir, readFile, writeFile } from "fs-extra";

import type { Mesh } from "babylonjs";

import type { Editor } from "../../../editor/main";

import type { ITerrainImage, ITerrainRgbaImage } from "../core/types";

import { getTerrainMeshLayerMask, getTerrainPlugin } from "../engine/info";
import { importTerrainSplatMapsAsync, setTerrainLayerMaskAsync } from "../engine/operations";

import { toTerrainAbsolutePath } from "./paths";
import { decodeTerrainRaw16Heightmap, getTerrainImageLuminance, isTerrainRawHeightmapPath, readTerrainImageFile } from "./heightmap";

/**
 * Imports a layer mask (§4.10.8) through setTerrainLayerMaskAsync (one undo entry): any image sharp decodes (8/16-bit; RGB → luminance,
 * multiplied by the alpha channel when there is one, so transparent pixels are 0) or a RAW16 file, image order (image top = +Z edge),
 * values 0..1 = the new weight of the layer; resampled to the weight map by the engine.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 * @param layerId defines the id of the layer whose mask is replaced.
 * @param absolutePath defines the absolute path of the mask image, read in place (a project-relative path is resolved against the project).
 */
export async function importTerrainLayerMask(editor: Editor, mesh: Mesh, layerId: string, absolutePath: string): Promise<void> {
	const path = toTerrainAbsolutePath(absolutePath);

	let mask: ITerrainImage;
	try {
		mask = await readTerrainLayerMaskFile(path);
	} catch (e) {
		throw new Error(`Can't read the layer mask "${basename(path)}": ${getErrorMessage(e)}`);
	}

	await setTerrainLayerMaskAsync(editor, mesh, layerId, mask);
}

/**
 * Exports the weights of a layer as a grayscale 8-bit image (§4.10.8, §1.12): value = weight / 255, N x N pixels (the weight map size),
 * image order (image top = +Z edge). PNG, or TIFF when the path ends with ".tif"/".tiff". Waits for the weight maps to load first.
 * @param mesh defines the terrain.
 * @param layerId defines the id of the layer to export.
 * @param absolutePath defines the absolute path of the file to write, folder created (a project-relative path is resolved against the project).
 */
export async function exportTerrainLayerMask(mesh: Mesh, layerId: string, absolutePath: string): Promise<void> {
	const plugin = getTerrainPlugin(mesh);
	if (!plugin) {
		throw new Error(`"${mesh.name}" has no terrain material: enable texture painting first.`);
	}

	if (!plugin.data.layers.some((layer) => layer.id === layerId)) {
		throw new Error(`Layer "${layerId}" not found on terrain "${mesh.name}".`);
	}

	await plugin.whenWeightMapsReadyAsync();

	const mask = getTerrainMeshLayerMask(mesh, layerId);
	if (!mask) {
		throw new Error("The painted layers couldn't be loaded: retry, locate or reset them first.");
	}

	const count = mask.width * mask.height;
	const pixels = Buffer.alloc(count);
	for (let i = 0; i < count; ++i) {
		const value = mask.data[i];
		pixels[i] = Math.round((value > 0 ? (value < 1 ? value : 1) : 0) * 255);
	}

	const path = toTerrainAbsolutePath(absolutePath);
	const extension = extname(path).toLowerCase();

	const image = sharp(pixels, {
		raw: {
			width: mask.width,
			height: mask.height,
			channels: 1,
		},
	}).toColourspace("b-w");

	const content = extension === ".tif" || extension === ".tiff" ? await image.tiff({ compression: "lzw" }).toBuffer() : await image.png().toBuffer();

	await ensureDir(dirname(path));
	await writeFile(path, content);
}

/**
 * Reads 1 or 2 RGBA splat maps with sharp (8-bit, ensureAlpha, image order: image top = +Z edge; flipY flips the rows first) and calls
 * importTerrainSplatMapsAsync(editor, one undo entry; it enables texture painting and adds layers up to 4 x the number of splats when needed, §4.10.10).
 * Channel c of splat k is the weight of layer 4k + c.
 * @param editor defines the reference to the editor.
 * @param mesh defines the terrain.
 * @param absolutePaths defines the splat map of layers 1-4 and the optional splat map of layers 5-8, read in place (project-relative paths are
 * resolved against the project).
 * @param options defines whether or not the rows are flipped (images whose top is the -Z edge).
 */
export async function importTerrainSplatMaps(editor: Editor, mesh: Mesh, absolutePaths: [string, string | null], options?: { flipY?: boolean }): Promise<void> {
	const flipY = options?.flipY ?? false;

	const first = await readTerrainSplatMapFile(absolutePaths[0], flipY);
	const second = absolutePaths[1] ? await readTerrainSplatMapFile(absolutePaths[1], flipY) : null;

	await importTerrainSplatMapsAsync(editor, mesh, [first, second]);
}

/**
 * Reads a layer mask image: values 0..1, image order.
 * @param absolutePath defines the absolute path of the mask.
 */
export async function readTerrainLayerMaskFile(absolutePath: string): Promise<ITerrainImage> {
	const path = toTerrainAbsolutePath(absolutePath);

	if (isTerrainRawHeightmapPath(path)) {
		const raw = decodeTerrainRaw16Heightmap(await readFile(path));
		return {
			width: raw.width,
			height: raw.height,
			data: raw.data,
		};
	}

	const file = await readTerrainImageFile(path);
	return {
		width: file.width,
		height: file.height,
		data: getTerrainImageLuminance(file, true),
	};
}

/**
 * Reads a splat map as RGBA8 (image order, rows flipped when flipY is true). 16-bit files are reduced to 8 bits.
 * @param absolutePath defines the absolute path of the splat map.
 * @param flipY defines whether or not the rows are flipped.
 */
export async function readTerrainSplatMapFile(absolutePath: string, flipY: boolean): Promise<ITerrainRgbaImage> {
	const path = toTerrainAbsolutePath(absolutePath);

	try {
		// Weights are data: an embedded ICC profile is ignored (sharp would convert the samples through it).
		let image = sharp(path, { ignoreIcc: true }).toColourspace("srgb");
		if (flipY) {
			image = image.flip();
		}

		const { data, info } = await image.ensureAlpha().raw({ depth: "uchar" }).toBuffer({ resolveWithObject: true });
		if (info.channels !== 4) {
			throw new Error(`${info.channels} channels decoded instead of 4.`);
		}

		return {
			width: info.width,
			height: info.height,
			data: new Uint8Array(data.subarray(0, info.width * info.height * 4)),
		};
	} catch (e) {
		throw new Error(`Can't read the splat map "${basename(path)}": ${getErrorMessage(e)}`);
	}
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
