import { join } from "path/posix";
import { readJSON } from "fs-extra";

import { Scene, Sound } from "babylonjs";

import { Editor } from "../../../editor/main";

import { ISceneLoaderPluginOptions } from "../scene";

export async function loadSounds(editor: Editor, soundFiles: string[], scene: Scene, options: ISceneLoaderPluginOptions) {
	const loadedSounds = await Promise.all(
		soundFiles.map(async (file) => {
			if (file.startsWith(".")) {
				return;
			}

			try {
				const data = await readJSON(join(options.scenePath, "sounds", file), "utf-8");

				if (data.name && options.assetsCache[data.name]) {
					data.name = options.assetsCache[data.name].newRelativePath;
				}

				if (data.url && options.assetsCache[data.url]) {
					data.url = options.assetsCache[data.url].newRelativePath;
				}

				const sound = Sound.Parse(data, scene, join(options.projectPath, "/"));
				sound["_url"] = data.url;
				sound.id = data.id;
				sound.uniqueId = data.uniqueId;

				return sound;
			} catch (e) {
				editor.layout.console.error(`Failed to load sound file "${file}": ${e.message}`);
			}

			options.progress.step(options.progressStep);
		})
	);

	// Re-add lights to keep correct order
	loadedSounds.forEach((sound) => {
		if (sound) {
			scene.mainSoundTrack?.removeSound(sound);
			scene.mainSoundTrack?.addSound(sound);
		}
	});
}
