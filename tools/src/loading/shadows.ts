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
		const savedShadowGenerators = new Map<string, number>();

		parsedData.shadowGenerators?.forEach((shadowGenerator: any) => {
			savedShadowGenerators.set(shadowGenerator.id, shadowGenerator.mapSize);

			if (scene.loadingShadowsQuality !== "high") {
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
			}
		});

		shadowsGeneratorParser?.(parsedData, scene, container, rootUrl);

		scene.lights.forEach((light) => {
			const shadowGenerator = light.getShadowGenerator();
			const shadowMap = shadowGenerator?.getShadowMap();

			if (shadowMap) {
				const id = shadowGenerator!.id;
				const savedMapSize = savedShadowGenerators.get(id);
				if (savedMapSize) {
					shadowGenerator!.originalMapSize = savedMapSize;
				}
			}
		});
	});
}
