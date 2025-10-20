import { Sprite } from "@babylonjs/core/Sprites/sprite";
import { SpriteMap } from "@babylonjs/core/Sprites/spriteMap";
import { IVector2Like } from "@babylonjs/core/Maths/math.like";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { SpriteManager } from "@babylonjs/core/Sprites/spriteManager";

declare module "@babylonjs/core/Sprites/sprite" {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	export interface Sprite {
		metadata: any;
	}
}

export interface ISpriteAnimation {
	name: string;
	from: number;
	to: number;
	loop: boolean;
	delay: number;
}

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
	isSpriteMap?: boolean;
	spriteMap?: SpriteMap | null;
}

/**
 * This interface is used to define extra properties on TransformNode. For example for SpriteManager support.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface SpriteManagerNode extends TransformNode {
	isSpriteManager?: boolean;
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

/**
 * Plays a sprite animation previously setup in the editor indentified by its name.
 * @param sprite defines the reference to the sprite to animate.
 * @param animationName defines the name of the animation to play previously setup in the editor.
 * @param onAnimationEnd defines an optional callback to be called when the animation ends.
 */
export function playSpriteAnimationFromName(sprite: Sprite, animationName: string, onAnimationEnd?: () => void) {
	const spriteAnimations = (sprite.metadata?.spriteAnimations ?? []) as ISpriteAnimation[];
	const animation = spriteAnimations.find((a) => a.name === animationName);

	if (!animation) {
		return console.error(`Animation with name "${animationName}" not found on sprite.`);
	}

	sprite.playAnimation(animation.from, animation.to, animation.loop, animation.delay, onAnimationEnd);
}
