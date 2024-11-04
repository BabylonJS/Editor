import { readJSON } from "fs-extra";

import { AdvancedDynamicTexture } from "babylonjs-gui";

import { Editor } from "../../../main";

/**
 * Imports the GUI file located at the given absolute path and adds it to the scene.
 * @param editor defines the reference to the editor.
 * @param absolutePath defines the absolute path to the GUI file to import.
 */
export async function applyImportedGuiFile(editor: Editor, absolutePath: string) {
    const data = await readJSON(absolutePath, {
        encoding: "utf8",
    });

    if (data.guiType === "fullscreen") {
        const gui = AdvancedDynamicTexture.CreateFullscreenUI(data.name, true, editor.layout.preview.scene);
        gui.parseSerializedObject(data.content, false);
        gui.uniqueId = data.uniqueId;

        return gui;
    }
}
