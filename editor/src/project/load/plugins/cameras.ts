import { join } from "path/posix";
import { readJSON } from "fs-extra";

import { Scene, Camera } from "babylonjs";

import { Editor } from "../../../editor/main";

import { ISceneLoaderPluginOptions } from "../scene";

export async function loadCameras(editor: Editor, cameraFiles: string[], scene: Scene, options: ISceneLoaderPluginOptions) {
	const loadedCameras = await Promise.all(
		cameraFiles.map(async (file) => {
			if (file.startsWith(".")) {
				return;
			}

			try {
				const data = await readJSON(join(options.scenePath, "cameras", file), "utf-8");

				if (options?.asLink && data.metadata?.doNotSerialize) {
					return;
				}

				const camera = Camera.Parse(data, scene);
				camera.uniqueId = data.uniqueId;
				camera._waitingParentId = data.parentId;
				camera.metadata ??= {};
				camera.metadata._waitingParentId = data.metadata?.parentId;

				options.loadResult.cameras.push(camera);

				return camera;
			} catch (e) {
				editor.layout.console.error(`Failed to load camera file "${file}": ${e.message}`);
			}

			options.progress.step(options.progressStep);
		})
	);

	// Re-add cameras to keep correct order
	loadedCameras.forEach((camera) => {
		if (camera) {
			scene.removeCamera(camera);
			scene.addCamera(camera);
		}
	});
}
