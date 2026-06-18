import { ClusteredLightContainer } from "babylonjs";

export function configureClusteredLights(data: any, clusteredLightContainer: ClusteredLightContainer) {
	clusteredLightContainer.lights.forEach((light) => {
		if (!light.doNotSerialize) {
			data.lights.push(light.serialize());
		}
	});

	if (clusteredLightContainer.lights.length > 0) {
		data.metadata.clusteredLight = {
			horizontalTiles: clusteredLightContainer.horizontalTiles,
			verticalTiles: clusteredLightContainer.verticalTiles,
			depthSlices: clusteredLightContainer.depthSlices,
			maxRange: clusteredLightContainer.maxRange,
			lights: clusteredLightContainer.lights.map((light) => light.id),
		};
	}
}
