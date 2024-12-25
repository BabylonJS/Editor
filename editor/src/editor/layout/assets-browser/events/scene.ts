import { ipcRenderer } from "electron";
import { join, dirname } from "path/posix";

import { isSceneLinkNode } from "../../../../tools/guards/scene";

import { projectConfiguration } from "../../../../project/configuration";

import { Editor } from "../../../main";

export function listenSceneAssetsEvents(editor: Editor) {
    ipcRenderer.on("editor:asset-updated", (_, type, data) => {
        if (type !== "scene" || !projectConfiguration.path) {
            return;
        }

        const scene = editor.layout.preview.scene;

        scene.transformNodes.forEach(async (transformNode) => {
            if (!isSceneLinkNode(transformNode)) {
                return;
            }

            const relativePath = data.replace(join(dirname(projectConfiguration.path!), "/"), "");
            if (transformNode.relativePath === relativePath) {
                await transformNode.reload();
            }
        });
    });
}
