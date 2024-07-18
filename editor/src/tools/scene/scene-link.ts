import { join, dirname, basename } from "path/posix";

import { Node } from "babylonjs";

import { Editor } from "../../editor/main";
import { SceneLinkNode } from "../../editor/nodes/scene-link";

import { isSceneLinkNode } from "../../tools/guards/scene";

import { projectConfiguration } from "../../project/configuration";

export async function createSceneLink(editor: Editor, absolutePath: string) {
    if (!projectConfiguration.path) {
        return;
    }

    const node = new SceneLinkNode(basename(absolutePath), editor.layout.preview.scene, editor);

    const relativePath = absolutePath.replace(join(dirname(projectConfiguration.path!), "/"), "");
    const result = await node.setRelativePath(relativePath);

    result?.meshes.forEach((mesh) => !mesh.parent && (mesh.parent = node));
    result?.lights.forEach((light) => !light.parent && (light.parent = node));
    result?.cameras.forEach((camera) => !camera.parent && (camera.parent = node));
    result?.transformNodes.forEach((transformNode) => !transformNode.parent && (transformNode.parent = node));

    editor.layout.graph.refresh();
    editor.layout.inspector.setEditedObject(node);

    return node;
}

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
