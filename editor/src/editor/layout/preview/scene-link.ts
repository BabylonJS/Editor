import { join, dirname, basename } from "path/posix";

import { Editor } from "../../main";

import { SceneLinkNode } from "../../nodes/scene-link";
import { projectConfiguration } from "../../../project/configuration";

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
