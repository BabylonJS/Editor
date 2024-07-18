import { Node } from "babylonjs";

import { isSceneLinkNode } from "../../tools/guards/scene";

/**
 * Returns wether or not the given node is a descendant of a SceneLinkNode instance.
 */
export function isFromSceneLink(node: Node) {
    let parent: Node | null = node;
    while (parent) {
        if (isSceneLinkNode(parent)) {
            return true;
        }

        parent = parent.parent;
    }

    return false;
}

/**
 * Returns the firt root SceneLinkNode found for the given node.
 * In case the node is not from a scene link, "null" is returned.
 */
export function getRootSceneLink(node: Node) {
    let parent: Node | null = node;
    while (parent) {
        if (isSceneLinkNode(parent)) {
            return parent;
        }

        parent = parent.parent;
    }

    return null;
}
