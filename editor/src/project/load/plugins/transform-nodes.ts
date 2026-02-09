import { join } from "path/posix";
import { readJSON } from "fs-extra";

import { Scene, TransformNode } from "babylonjs";

import { Editor } from "../../../editor/main";

import { ISceneLoaderPluginOptions } from "../scene";

export async function loadTransformNodes(editor: Editor, nodesFiles: string[], scene: Scene, options: ISceneLoaderPluginOptions) {
	const loadedTransformNodes = await Promise.all(
		nodesFiles.map(async (file) => {
			if (file.startsWith(".")) {
				return;
			}

			try {
				const data = await readJSON(join(options.scenePath, "nodes", file), "utf-8");

				if (options?.asLink && data.metadata?.doNotSerialize) {
					return;
				}

				const transformNode = TransformNode.Parse(data, scene, join(options.projectPath, "/"));
				transformNode.uniqueId = data.uniqueId;
				transformNode.metadata ??= {};
				transformNode.metadata._waitingParentId = data.metadata?.parentId;

				options.loadResult.transformNodes.push(transformNode);

				return transformNode;
			} catch (e) {
				editor.layout.console.error(`Failed to load transform node file "${file}": ${e.message}`);
			}

			options.progress.step(options.progressStep);
		})
	);

	// Re-add transform nodes to keep correct order
	loadedTransformNodes.forEach((transformNode) => {
		if (transformNode) {
			scene.removeTransformNode(transformNode);
			scene.addTransformNode(transformNode);
		}
	});
}
