import { join } from "path/posix";
import { ipcRenderer } from "electron";

import { Editor } from "../../../main";

import { getProjectAssetsRootUrl } from "../../../../project/configuration";

import { createDirectoryIfNotExist } from "../../../../tools/fs";
import { extractNodeParticleSystemSetTextures } from "../../../../tools/particles/extract";

export function listenParticleAssetsEvents(editor: Editor) {
	ipcRenderer.on("editor:asset-updated", async (_, type, particlesData) => {
		if (type !== "particle-system") {
			return;
		}

		const rootUrl = getProjectAssetsRootUrl();
		if (rootUrl) {
			const outputPath = join(rootUrl, "assets", "editor-generated_extracted-textures");

			await createDirectoryIfNotExist(outputPath);
			await extractNodeParticleSystemSetTextures(editor, {
				particlesData,
				assetsDirectory: outputPath,
			});
		}

		// const particleSystems = editor.layout.preview.scene.particleSystems;
		// await Promise.all(
		// 	particleSystems.map(async (ps) => {
		// 		if (ps.sourceParticleSystemSetId !== particlesData.id) {
		// 			return;
		// 		}

		// 		const rootUrl = getProjectAssetsRootUrl();
		// 		if (rootUrl) {
		// 			const outputPath = join(rootUrl, "assets", "editor-generated_extracted-textures");

		// 			await createDirectoryIfNotExist(outputPath);
		// 			await extractNodeParticleSystemSetTextures(editor, {
		// 				particlesData,
		// 				assetsDirectory: outputPath,
		// 			});
		// 		}

		// 		// TODO: update already instantiated particle systems sets?
		// 	})
		// );
	});
}
