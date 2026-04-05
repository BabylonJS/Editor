import { Scene } from "@babylonjs/core/scene";
import { ClusteredLightContainer } from "@babylonjs/core/Lights/Clustered/clusteredLightContainer";

export function configureLights(scene: Scene, clusteredLightContainer?: ClusteredLightContainer) {
	const clusteredLight = scene.metadata?.clusteredLight;
	if (clusteredLight) {
		if (clusteredLight.lights.length > 0) {
			clusteredLightContainer ??= new ClusteredLightContainer("Clustered Light Container", [], scene);
			clusteredLightContainer.horizontalTiles = clusteredLight.horizontalTiles;
			clusteredLightContainer.verticalTiles = clusteredLight.verticalTiles;
			clusteredLightContainer.depthSlices = clusteredLight.depthSlices;
			clusteredLightContainer.maxRange = clusteredLight.maxRange;
		}

		clusteredLight.lights.forEach((lightId: any) => {
			const light = scene.getLightById(lightId);
			if (light) {
				clusteredLightContainer?.addLight(light);
			}
		});
	}

	return clusteredLightContainer;
}
