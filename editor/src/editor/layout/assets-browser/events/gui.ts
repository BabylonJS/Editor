import { ipcRenderer } from "electron";

import { isAdvancedDynamicTexture } from "../../../../tools/guards/texture";

import { Editor } from "../../../main";

export function listenGuiAssetsEvents(editor: Editor) {
    ipcRenderer.on("editor:asset-updated", (_, type, data) => {
        if (type !== "gui") {
            return;
        }

        const texture = editor.layout.preview.scene.getTextureByUniqueId(data.uniqueId);
        if (!texture) {
            return;
        }

        if (isAdvancedDynamicTexture(texture)) {
            texture.parseSerializedObject(data.content, false);
        }
    });
}
