import { join } from "path/posix";
import { readJSON } from "fs-extra";

import { Scene, Skeleton } from "babylonjs";

import { Editor } from "../../../editor/main";

import { ISceneLoaderPluginOptions } from "../scene";

export async function loadSkeletons(editor: Editor, skeletonFiles: string[], scene: Scene, options: ISceneLoaderPluginOptions) {
	const loadedSkeletons = await Promise.all(
		skeletonFiles.map(async (file) => {
			if (file.startsWith(".")) {
				return;
			}

			try {
				const data = await readJSON(join(options.scenePath, "skeletons", file), "utf-8");
				return Skeleton.Parse(data, scene);
			} catch (e) {
				editor.layout.console.error(`Failed to load skeleton file "${file}": ${e.message}`);
			}
		})
	);

	// Re-add skeletons to keep correct order
	loadedSkeletons.forEach((skeleton) => {
		if (skeleton) {
			scene.removeSkeleton(skeleton);
			scene.addSkeleton(skeleton);
		}
	});
}
