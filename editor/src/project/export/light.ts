import { ClusteredLightContainer } from "babylonjs";

export function configureClusteredLights(data: any, clusteredLightContainer: ClusteredLightContainer) {
	clusteredLightContainer.lights.forEach((light) => {
		if (!light.doNotSerialize) {
			data.lights.push(light.serialize());
		}
	});

	data.metadata.clusteredLights = clusteredLightContainer.lights.map((light) => light.id);
}
