import { Node } from "babylonjs";

import { isSceneLinkNode } from "../../tools/guards/scene";

export function isFromSceneLink(object: Node) {
    let parent: Node | null = object;
    while (parent) {
        if (isSceneLinkNode(parent)) {
            return true;
        }

        parent = parent.parent;
    }

    return false;
}
