import { join } from "path/posix";
import { readJSON } from "fs-extra";

import { Scene } from "babylonjs";

import { Editor } from "../../../editor/main";

import { SoundNode } from "../../../editor/nodes/sound";

import { ISceneLoaderPluginOptions } from "../scene";

export async function loadSoundNodes(editor: Editor, soundNodeFiles: string[], scene: Scene, options: ISceneLoaderPluginOptions) {
	const loadedSoundNodes = await Promise.all(
		soundNodeFiles.map(async (file) => {
			if (file.startsWith(".")) {
				return;
			}

			try {
				const data = await readJSON(join(options.scenePath, "soundNodes", file), "utf-8");

				if (data.soundRelativePath && options.assetsCache[data.soundRelativePath]) {
					data.soundRelativePath = options.assetsCache[data.soundRelativePath].newRelativePath;
				}

				const node = SoundNode.Parse(data, scene, join(options.projectPath, "/"));
				node.uniqueId = data.uniqueId;
				node.metadata ??= {};
				node.metadata._waitingParentId = data.metadata?.parentId;

				options.loadResult.soundNodes.push(node);

				return node;
			} catch (e) {
				editor.layout.console.error(`Failed to load sound node file "${file}": ${e.message}`);
			}

			options.progress.step(options.progressStep);
		})
	);

	// Re-add sound nodes to keep correct order
	loadedSoundNodes.forEach((soundNode) => {
		if (soundNode) {
			scene.removeTransformNode(soundNode);
			scene.addTransformNode(soundNode);
		}
	});
}
