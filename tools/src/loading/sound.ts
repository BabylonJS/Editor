import { Scene } from "@babylonjs/core/scene";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { AddParser } from "@babylonjs/core/Loading/Plugins/babylonFileParser.function";

let registered = false;

export function registerAudioParser() {
	if (registered) {
		return;
	}

	registered = true;

	// const audioParser = GetParser(SceneComponentConstants.NAME_AUDIO);

	AddParser("AudioEditorPlugin", (parsedData: any, scene: Scene, container: AssetContainer, _rootUrl: string) => {
		// audioParser?.(parsedData, scene, container, rootUrl);

		parsedData.sounds?.forEach((sound) => {
			const instance = container.sounds?.find((s) => s.name === sound.name);
			if (instance) {
				instance.id = sound.id;
				instance.uniqueId = sound.uniqueId;

				scene.onBeforeRenderObservable.addOnce(() => {
					// Backward compatibility, check if "spatialSound" is not getter only
					try {
						instance.spatialSound = sound.spatialSound;
					} catch (e) {
						// Catch silently.
					}
				});
			}
		});
	});
}
