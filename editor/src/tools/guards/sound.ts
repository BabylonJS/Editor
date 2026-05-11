import { SoundNode } from "../../editor/nodes/sound";

/**
 * Returns wether or not the given object is a SoundNode.
 * @param object defines the reference to the object to test its class name.
 */
export function isSoundNode(object: any): object is SoundNode {
	return object.getClassName?.() === "SoundNode";
}
