import { basename, join } from "path/posix";
import { readJSON, readFile } from "fs-extra";

import { Scene, MorphTargetManager } from "babylonjs";

import { Editor } from "../../../editor/main";

import { ISceneLoaderPluginOptions } from "../scene";

export async function loadMorphTargetManagers(editor: Editor, morphTargetManagerFiles: string[], scene: Scene, options: ISceneLoaderPluginOptions) {
	const loadedMorphTargetManagers = await Promise.all(
		morphTargetManagerFiles.map(async (file) => {
			if (file.startsWith(".")) {
				return;
			}

			try {
				const data = await readJSON(join(options.scenePath, "morphTargetManagers", file), "utf-8");

				await Promise.all(
					data.targets.map(async (target) => {
						const binaryFileData = join(options.scenePath, "morphTargets", basename(target.delayLoadingFile));
						const buffer = (await readFile(binaryFileData)).buffer;

						if (target.positionsCount) {
							target.positions = new Float32Array(buffer, target.positionsOffset, target.positionsCount);
						}

						if (target.normalsCount) {
							target.normals = new Float32Array(buffer, target.normalsOffset, target.normalsCount);
						}

						if (target.tangentsCount) {
							target.tangents = new Float32Array(buffer, target.tangentsOffset, target.tangentsCount);
						}

						if (target.uvsCount) {
							target.uvs = new Float32Array(buffer, target.uvsOffset, target.uvsCount);
						}

						if (target.uv2sCount) {
							target.uv2s = new Float32Array(buffer, target.uv2sOffset, target.uv2sCount);
						}
					})
				);

				const mesh = scene.getMeshById(data.meshId);
				if (mesh) {
					const morphTargetManager = MorphTargetManager.Parse(data, scene);
					morphTargetManager["_uniqueId"] = data.uniqueId;

					for (let i = 0, len = morphTargetManager.numTargets; i < len; i++) {
						const target = morphTargetManager.getTarget(i);
						target["_uniqueId"] = data.targets[i].uniqueId;
					}

					mesh.morphTargetManager = morphTargetManager;

					return morphTargetManager;
				}
			} catch (e) {
				editor.layout.console.error(`Failed to load morph target manager file "${file}": ${e.message}`);
			}

			options.progress.step(options.progressStep);
		})
	);

	// Re-add morph target managers to keep correct order
	loadedMorphTargetManagers.forEach((morphTargetManager) => {
		if (morphTargetManager) {
			scene.removeMorphTargetManager(morphTargetManager);
			scene.addMorphTargetManager(morphTargetManager);
		}
	});
}
