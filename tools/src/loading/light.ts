import { Scene } from "@babylonjs/core/scene";
import { ClusteredLightContainer } from "@babylonjs/core/Lights/Clustered/clusteredLightContainer";

export function configureLights(scene: Scene, clusteredLightContainer?: ClusteredLightContainer) {
	const clusteredLights = scene.metadata?.clusteredLights ?? [];
	if (clusteredLights.length > 0) {
		clusteredLightContainer ??= new ClusteredLightContainer("Clustered Light Container", [], scene);
	}

	scene.metadata?.clusteredLights?.forEach((lightId: any) => {
		const light = scene.getLightById(lightId);
		if (light) {
			clusteredLightContainer?.addLight(light);
		}
	});

	return clusteredLightContainer;
}
