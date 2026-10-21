import { setClassName } from "../tools/guards";
import { SpriteMapNode } from "../tools/sprite";

/**
 * Configures the given node as a sprite map node. Babylon Lite has no sprite map: the tiles of the sprite map are
 * not loaded and `spriteMap` is always null.
 * @param instance defines the reference to the node created for the serialized sprite map node.
 * @param data defines the serialized sprite map node.
 */
export function parseSpriteMapNode(instance: SpriteMapNode, data: any): void {
	instance.isSpriteMap = data.isSpriteMap;
	instance.spriteMap = null;
	instance.getClassName = () => "SpriteMapNode";

	setClassName(instance, "SpriteMapNode");

	console.warn(`Babylon.js Editor Tools Lite: the sprite map "${data.name}" is not supported by Babylon Lite.`);
}
