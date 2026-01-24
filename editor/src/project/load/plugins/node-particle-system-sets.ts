import { join } from "path/posix";
import { readJSON } from "fs-extra";

import { Scene } from "babylonjs";

import { Editor } from "../../../editor/main";

import { NodeParticleSystemSetMesh } from "../../../editor/nodes/node-particle-system";

import { ISceneLoaderPluginOptions } from "../scene";

export async function loadNodeParticleSystemSets(editor: Editor, nodeParticleSystemSetFiles: string[], scene: Scene, options: ISceneLoaderPluginOptions) {
	const loadedNodeParticleSystemMeshes = await Promise.all(
		nodeParticleSystemSetFiles.map(async (file) => {
			if (file.startsWith(".")) {
				return;
			}

			try {
				const data = await readJSON(join(options.scenePath, "nodeParticleSystemSets", file), "utf-8");

				if (options?.asLink && data.metadata?.doNotSerialize) {
					return;
				}

				const node = NodeParticleSystemSetMesh.Parse(data, scene, join(options.projectPath, "/"));
				node.uniqueId = data.uniqueId;
				node.metadata ??= {};
				node.metadata._waitingParentId = data.metadata?.parentId;

				options.loadResult.meshes.push(node);

				return node;
			} catch (e) {
				editor.layout.console.error(`Failed to load node particle system set file "${file}": ${e.message}`);
			}

			options.progress.step(options.progressStep);
		})
	);

	// Re-add node particle system sets to keep correct order
	loadedNodeParticleSystemMeshes.forEach((nodeParticleSystemMesh) => {
		if (nodeParticleSystemMesh) {
			scene.removeMesh(nodeParticleSystemMesh);
			scene.addMesh(nodeParticleSystemMesh);
		}
	});
}
