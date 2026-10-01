import sharp from "sharp";
import { basename } from "path/posix";

import type { Mesh } from "babylonjs";

import type { Editor } from "../../../editor/main";

import type { ITerrainRgbaImage } from "../core/types";

import { importTerrainSplatMapsAsync } from "../engine/operations";

import { toTerrainAbsolutePath } from "./paths";

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
