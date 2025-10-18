import { SpriteMapNode } from "../../editor/nodes/sprite-map";
import { SpriteManagerNode } from "../../editor/nodes/sprite-manager";
import { Sprite } from "babylonjs";

/**
 * Returns wether or not the given object is a Sprite.
 * @param object defines the reference to the object to test its class name.
 */
export function isSprite(object: any): object is Sprite {
	return object.getClassName?.() === "Sprite";
}

/**
 * Returns wether or not the given object is a SpriteMapNode.
 * @param object defines the reference to the object to test its class name.
 */
export function isSpriteMapNode(object: any): object is SpriteMapNode {
	return object.getClassName?.() === "SpriteMapNode";
}

/**
 * Returns wether or not the given object is a SpriteManagerNode.
 * @param object defines the reference to the object to test its class name.
 */
export function isSpriteManagerNode(object: any): object is SpriteManagerNode {
	return object.getClassName?.() === "SpriteManagerNode";
}
