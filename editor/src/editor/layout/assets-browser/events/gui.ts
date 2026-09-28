import { ipcRenderer } from "electron";

import { isAdvancedDynamicTexture } from "../../../../tools/guards/texture";

import { Editor } from "../../../main";

export function listenGuiAssetsEvents(editor: Editor) {
	ipcRenderer.on("editor:asset-updated", (_, type, data) => {
		if (type !== "gui") {
			return;
		}

		reloadGuiTexture(editor, data);
	});
}

/**
 * Parses again the content of the GUI of the scene created from the given serialized GUI, matched by its unique id.
 * @param editor defines the reference to the editor.
 * @param data defines the content of the GUI asset (.gui).
 * @returns the number of GUI reloaded.
 */
export function reloadGuiTexture(editor: Editor, data: any): number {
	const texture = editor.layout.preview.scene.getTextureByUniqueId(data.uniqueId);
	if (!texture || !isAdvancedDynamicTexture(texture)) {
		return 0;
	}

	texture.parseSerializedObject(data.content, false);

	return 1;
}
