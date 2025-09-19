import { Scene } from "@babylonjs/core/scene";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { SceneComponentConstants } from "@babylonjs/core/sceneComponent";
import { GetParser, AddParser } from "@babylonjs/core/Loading/Plugins/babylonFileParser.function";

import { getPowerOfTwoUntil } from "../tools/scalar";

let registered = false;

export function registerShadowGeneratorParser() {
	if (registered) {
		return;
	}

	registered = true;

	const shadowsGeneratorParser = GetParser(SceneComponentConstants.NAME_SHADOWGENERATOR);

	AddParser("ShadowGeneratorEditorPlugin", (parsedData: any, scene: Scene, container: AssetContainer, rootUrl: string) => {
		if (scene.loadingShadowsQuality !== "high") {
			parsedData.shadowGenerators?.forEach((shadowGenerator: any) => {
				switch (scene.loadingShadowsQuality) {
					case "medium":
						shadowGenerator.mapSize = shadowGenerator.mapSize * 0.5;
						break;

					case "low":
						shadowGenerator.mapSize = shadowGenerator.mapSize * 0.25;
						break;

					case "very-low":
						shadowGenerator.mapSize = shadowGenerator.mapSize * 0.125;
						break;
				}

				shadowGenerator.mapSize = Math.max(128, getPowerOfTwoUntil(shadowGenerator.mapSize));
			});
		}

		shadowsGeneratorParser?.(parsedData, scene, container, rootUrl);
	});
}
