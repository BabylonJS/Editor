import { join } from "path/posix";
import { readJSON } from "fs-extra";

import { Scene, AnimationGroup } from "babylonjs";

import { Editor } from "../../../editor/main";

import { ISceneLoaderPluginOptions } from "../scene";

export async function loadAnimationGroups(editor: Editor, animationGroupFiles: string[], scene: Scene, options: ISceneLoaderPluginOptions) {
	const loadedAnimationGroups = await Promise.all(
		animationGroupFiles.map(async (file) => {
			if (file.startsWith(".")) {
				return;
			}

			try {
				const data = await readJSON(join(options.scenePath, "animationGroups", file), "utf-8");

				const animationGroup = AnimationGroup.Parse(data, scene);
				animationGroup.uniqueId = data.uniqueId;

				if (animationGroup.targetedAnimations.length === 0) {
					animationGroup.dispose();
				} else {
					options.loadResult.animationGroups.push(animationGroup);
					return animationGroup;
				}
			} catch (e) {
				editor.layout.console.error(`Failed to load animation group file "${file}": ${e.message}`);
			}

			options.progress.step(options.progressStep);
		})
	);

	// Re-add lights to keep correct order
	loadedAnimationGroups.forEach((animationGroup) => {
		if (animationGroup) {
			scene.removeAnimationGroup(animationGroup);
			scene.addAnimationGroup(animationGroup);
		}
	});
}
