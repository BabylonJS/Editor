import { ipcRenderer } from "electron";

import { isNodeMaterial } from "../../../../tools/guards/material";
import { normalizeNodeMaterialUniqueIds } from "../../../../tools/material/material";

import { getProjectAssetsRootUrl } from "../../../../project/configuration";

import { Editor } from "../../../main";

export function listenMaterialAssetsEvents(editor: Editor) {
	ipcRenderer.on("editor:asset-updated", async (_, type, materialData) => {
		if (type !== "material") {
			return;
		}

		const material = editor.layout.preview.scene.getMaterialByUniqueId(materialData.uniqueId);
		if (!material) {
			return;
		}

		if (isNodeMaterial(material)) {
			material.clear();
			material.parseSerializedObject(materialData, getProjectAssetsRootUrl() ?? undefined);
			material.build(false);

			normalizeNodeMaterialUniqueIds(material, materialData);
		}
	});
}
