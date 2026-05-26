import { Node } from "@babylonjs/core/node";

/**
 * Returns wether or not the given node is a descendant of a transform node set as static group.
 * @param node defines the reference to the node to check the ancestors.
 */
export function isNodeFromStaticGroup(node: Node) {
	let parent: Node | null = node;

	while (parent) {
		if (parent.metadata?.isStaticGroup) {
			return true;
		}

		parent = parent.parent;
	}

	return false;
}
