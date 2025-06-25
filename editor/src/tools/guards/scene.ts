import { Scene } from "babylonjs";

import { SceneLinkNode } from "../../editor/nodes/scene-link";

/**
 * Returns wether or not the given object is a Scene.
 * @param object defines the reference to the object to test its class name.
 */
export function isScene(object: any): object is Scene {
	return object.getClassName?.() === "Scene";
}

/**
 * Returns wether or not the given object is a SceneLinkNode.
 * @param object defines the reference to the object to test its class name.
 */
export function isSceneLinkNode(object: any): object is SceneLinkNode {
	return object.getClassName?.() === "SceneLinkNode";
}
