import sharp from "sharp";

import type { ITerrainBrushMask, ITerrainBrushShape, TerrainFalloff } from "../core/types";

export interface ITerrainBrush {
	id: string;
	name: string;
	/**
	 * The shape of the round and square brushes is computed from the hardness and the falloff of the brush settings: their image is only
	 * shown in the palette. The shape of the other brushes is their image.
	 */
	kind: "round" | "square" | "image";
	/** Image of the brush in the assets of the editor. */
	image: string;
}

/**
 * Brushes of the terrain tool, in the order of the palette. Their images are the files of the "assets/terrain/brush" folder of the editor:
 * 16-bit grayscale PNG files, white where the brush has its full strength.
 */
export const TERRAIN_BRUSHES: readonly ITerrainBrush[] = [
	{ id: "builtin:round", name: "Soft round", kind: "round", image: "assets/terrain/brush/round.png" },
	{ id: "builtin:square", name: "Square", kind: "square", image: "assets/terrain/brush/square.png" },
	{ id: "builtin:gaussian", name: "Gaussian", kind: "image", image: "assets/terrain/brush/gaussian.png" },
	{ id: "builtin:noise", name: "Noisy round", kind: "image", image: "assets/terrain/brush/noise.png" },
	{ id: "builtin:crater", name: "Crater", kind: "image", image: "assets/terrain/brush/crater.png" },
	{ id: "builtin:peak", name: "Peak", kind: "image", image: "assets/terrain/brush/peak.png" },
	{ id: "builtin:plateau", name: "Plateau", kind: "image", image: "assets/terrain/brush/plateau.png" },
	{ id: "builtin:ridge", name: "Ridge", kind: "image", image: "assets/terrain/brush/ridge.png" },
];

/** Images of the brushes of the editor read so far, by id of brush. */
const masks = new Map<string, Promise<ITerrainBrushMask>>();

/**
 * Returns the brush that has the given id, null when there is none.
 * @param id defines the id of the brush.
 */
export function getTerrainBrush(id: string): ITerrainBrush | null {
	return TERRAIN_BRUSHES.find((brush) => brush.id === id) ?? null;
}

/**
 * Returns the shape of a brush for a stroke. An id that is not the id of a brush of the editor is the absolute path of an image used as
 * a custom brush. The image of a brush of the editor is read the first time the brush is used, the image of a custom brush each time:
 * its file can change.
 * @param id defines the id of the brush, or the absolute path of the image of a custom brush.
 * @param settings defines the falloff, the hardness and the edge falloff of the brush settings.
 */
export async function loadTerrainBrushShape(id: string, settings: { falloff: TerrainFalloff; hardness: number; edgeFalloff: boolean }): Promise<ITerrainBrushShape> {
	const brush = getTerrainBrush(id);

	let mask: ITerrainBrushMask | null = null;
	if (!brush) {
		mask = await readTerrainBrushImage(id);
	} else if (brush.kind === "image") {
		if (!masks.has(id)) {
			masks.set(
				id,
				fetch(brush.image).then(async (response) => readTerrainBrushImage(Buffer.from(await response.arrayBuffer())))
			);
		}

		mask = await masks.get(id)!;
	}

	return {
		id,
		kind: brush?.kind ?? "image",
		mask,
		falloff: settings.falloff,
		hardness: Math.min(0.95, Math.max(0, settings.hardness)),
		edgeFalloff: settings.edgeFalloff,
	};
}

/**
 * Reads an image as the shape of a brush: 256 x 256 values from 0 (black or transparent) to 1 (white), the first row being the top of the
 * image. An image that is not square is centered in the square.
 * @param image defines the path of the image, or its content.
 */
async function readTerrainBrushImage(image: string | Buffer): Promise<ITerrainBrushMask> {
	// The image is read as 16-bit grays: sharp gives 8-bit colors otherwise.
	const { data, info } = await sharp(image)
		.flatten({ background: "#000000" })
		.resize(256, 256, { fit: "contain", background: "#000000" })
		.toColourspace("grey16")
		.raw({ depth: "ushort" })
		.toBuffer({ resolveWithObject: true });

	// The pixels are copied: the buffer of sharp may not be aligned on 16 bits.
	const pixels = new Uint16Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
	const values = new Float32Array(info.width * info.height);

	for (let i = 0; i < values.length; ++i) {
		values[i] = pixels[i * info.channels] / 65535;
	}

	return { width: info.width, height: info.height, data: values };
}
