import { join } from "path/posix";
import { readJSON } from "fs-extra";

import { Scene } from "babylonjs";

import { Editor } from "../../../editor/main";

import { SpriteManagerNode } from "../../../editor/nodes/sprite-manager";

import { ISceneLoaderPluginOptions } from "../scene";

export async function loadSpriteManagers(editor: Editor, spriteManagerFiles: string[], scene: Scene, options: ISceneLoaderPluginOptions) {
	const loadedSpriteManagers = await Promise.all(
		spriteManagerFiles.map(async (file) => {
			if (file.startsWith(".")) {
				return;
			}

			try {
				const data = await readJSON(join(options.scenePath, "sprite-managers", file), "utf-8");

				if (data.spriteManager?.textureUrl && options.assetsCache[data.spriteManager.textureUrl]) {
					data.spriteManager.textureUrl = options.assetsCache[data.spriteManager.textureUrl].newRelativePath;
				}

				const node = SpriteManagerNode.Parse(data, scene, join(options.projectPath, "/"));
				node.uniqueId = data.uniqueId;
				node.metadata ??= {};
				node.metadata._waitingParentId = data.metadata?.parentId;

				options.loadResult.spriteManagers.push(node);

				return node;
			} catch (e) {
				editor.layout.console.error(`Failed to load sprite map file "${file}": ${e.message}`);
			}

			options.progress.step(options.progressStep);
		})
	);

	// Re-add lights to keep correct order
	loadedSpriteManagers.forEach((spriteManager) => {
		if (spriteManager) {
			scene.removeTransformNode(spriteManager);
			scene.addTransformNode(spriteManager);
		}
	});
}
