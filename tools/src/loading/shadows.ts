import { Scene } from "@babylonjs/core/scene";
import { AssetContainer } from "@babylonjs/core/assetContainer";
import { SceneComponentConstants } from "@babylonjs/core/sceneComponent";
import { GetParser, AddParser } from "@babylonjs/core/Loading/Plugins/babylonFileParser.function";

import { getPowerOfTwoUntil } from "../tools/scalar";

const shadowsGeneratorParser = GetParser(SceneComponentConstants.NAME_SHADOWGENERATOR);

AddParser(SceneComponentConstants.NAME_SHADOWGENERATOR, (parsedData: any, scene: Scene, container: AssetContainer, rootUrl: string) => {
	if (scene.loadingQuality !== "high") {
		parsedData.shadowGenerators?.forEach((shadowGenerator: any) => {
			switch (scene.loadingQuality) {
				case "medium":
					shadowGenerator.mapSize = shadowGenerator.mapSize * 0.5;
					break;

				case "low":
					shadowGenerator.mapSize = shadowGenerator.mapSize * 0.25;
					break;
			}

			shadowGenerator.mapSize = Math.max(128, getPowerOfTwoUntil(shadowGenerator.mapSize));
		});
	}

	shadowsGeneratorParser?.(parsedData, scene, container, rootUrl);
});
