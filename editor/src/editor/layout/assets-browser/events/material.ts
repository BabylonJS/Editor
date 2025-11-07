import { join } from "path/posix";
import { ipcRenderer } from "electron";

import { createDirectoryIfNotExist } from "../../../../tools/fs";
import { isNodeMaterial } from "../../../../tools/guards/material";
import { extractNodeMaterialTextures } from "../../../../tools/material/extract";
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
			const rootUrl = getProjectAssetsRootUrl();

			if (rootUrl) {
				const outputPath = join(rootUrl, "assets", "editor-generated_extracted-textures");

				await createDirectoryIfNotExist(outputPath);
				await extractNodeMaterialTextures(editor, {
					materialData,
					assetsDirectory: outputPath,
				});
			}

			material.clear();
			material.parseSerializedObject(materialData, rootUrl ?? undefined);
			material.build(false);

			normalizeNodeMaterialUniqueIds(material, materialData);
		}
	});
}
