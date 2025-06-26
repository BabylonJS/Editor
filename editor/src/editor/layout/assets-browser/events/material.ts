import { ipcRenderer } from "electron";

import { isNodeMaterial } from "../../../../tools/guards/material";

import { Editor } from "../../../main";

export function listenMaterialAssetsEvents(editor: Editor) {
	ipcRenderer.on("editor:asset-updated", (_, type, data) => {
		if (type !== "material") {
			return;
		}

		const material = editor.layout.preview.scene.getMaterialByUniqueID(data.uniqueId);
		if (!material) {
			return;
		}

		if (isNodeMaterial(material)) {
			material.clear();
			material.parseSerializedObject(data);
			material.build(false);
		}
	});
}
