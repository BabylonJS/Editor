import { ipcRenderer } from "electron";

import { NodeMaterial } from "babylonjs";

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
		if (material && isNodeMaterial(material)) {
			reloadNodeMaterial(material, materialData);
		}
	});
}

/**
 * Rebuilds the given node material from the given serialized node material.
 * @param material defines the node material of the scene to rebuild.
 * @param materialData defines the content of the node material asset (.material).
 */
export function reloadNodeMaterial(material: NodeMaterial, materialData: any): void {
	material.clear();
	material.parseSerializedObject(materialData, getProjectAssetsRootUrl() ?? undefined);
	material.build(false);

	normalizeNodeMaterialUniqueIds(material, materialData);
}
