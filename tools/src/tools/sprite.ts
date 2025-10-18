import { SpriteMap } from "@babylonjs/core/Sprites/spriteMap";
import { IVector2Like } from "@babylonjs/core/Maths/math.like";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { SpriteManager } from "@babylonjs/core/Sprites/spriteManager";

export interface ISpriteMapTile {
	id: string;
	name: string;
	layer: number;
	position: IVector2Like;
	repeatCount: IVector2Like;
	repeatOffset: IVector2Like;
	tile: number;
}

/**
 * This interface is used to define extra properties on TransformNode. For example for SpriteMap support.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface SpriteMapNode extends TransformNode {
	spriteMap?: SpriteMap | null;
}

/**
 * This interface is used to define extra properties on TransformNode. For example for SpriteManager support.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface SpriteManagerNode extends TransformNode {
	spriteManager?: SpriteManager | null;
}

export function normalizeAtlasJson(data: any) {
	if (!Array.isArray(data.frames)) {
		const frames: any[] = [];

		for (const key of Object.keys(data.frames)) {
			frames.push({
				filename: key,
				...data.frames[key],
			});
		}

		data.frames = frames;
	}
}
