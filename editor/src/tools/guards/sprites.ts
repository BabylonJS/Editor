import { SpriteMapNode } from "../../editor/nodes/sprite-map";

/**
 * Returns wether or not the given object is a SpriteMapNode.
 * @param object defines the reference to the object to test its class name.
 */
export function isSpriteMapNode(object: any): object is SpriteMapNode {
	return object.getClassName?.() === "SpriteMapNode";
}
