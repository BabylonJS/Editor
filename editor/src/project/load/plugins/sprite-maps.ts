import { join } from "path/posix";
import { readJSON } from "fs-extra";

import { Scene } from "babylonjs";

import { Editor } from "../../../editor/main";

import { SpriteMapNode } from "../../../editor/nodes/sprite-map";

import { ISceneLoaderPluginOptions } from "../scene";

export async function loadSpriteMaps(editor: Editor, spriteMapFiles: string[], scene: Scene, options: ISceneLoaderPluginOptions) {
	const loadedSpriteMaps = await Promise.all(
		spriteMapFiles.map(async (file) => {
			if (file.startsWith(".")) {
				return;
			}

			try {
				const data = await readJSON(join(options.scenePath, "sprite-maps", file), "utf-8");

				const node = SpriteMapNode.Parse(data, scene, join(options.projectPath, "/"));
				node.uniqueId = data.uniqueId;
				node.metadata ??= {};
				node.metadata._waitingParentId = data.metadata?.parentId;

				options.loadResult.spriteMaps.push(node);

				return node;
			} catch (e) {
				editor.layout.console.error(`Failed to load sprite map file "${file}": ${e.message}`);
			}

			options.progress.step(options.progressStep);
		})
	);

	// Re-add sprite maps to keep correct order
	loadedSpriteMaps.forEach((spriteMap) => {
		if (spriteMap) {
			scene.removeTransformNode(spriteMap);
			scene.addTransformNode(spriteMap);
		}
	});
}
