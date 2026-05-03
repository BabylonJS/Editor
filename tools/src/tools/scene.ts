import { Scene } from "@babylonjs/core/scene";

import { isClusteredLightContainer } from "./guards";

/**
 * Returns the node with the given name in the given scene.
 * This method also retrieves light nodes from clustered light containers.
 * @param name defines the name of the node to retrieve.
 * @param scene defines the reference to the scene to search the node in.
 * @returns the node if found, otherwise null.
 */
export function getNodeByName(name: string, scene: Scene) {
	const node = scene.getNodeByName(name);
	if (node) {
		return node;
	}

	const clusteredLightContainers = scene.lights.filter((light) => isClusteredLightContainer(light));
	for (const clusteredLightContainer of clusteredLightContainers) {
		const lightNode = clusteredLightContainer.lights.find((light) => light.name === name);
		if (lightNode) {
			return lightNode;
		}
	}

	return null;
}

/**
 * Returns the node with the given id in the given scene.
 * This method also retrieves light nodes from clustered light containers.
 * @param id defines the id of the node to retrieve.
 * @param scene defines the reference to the scene to search the node in.
 * @returns the node if found, otherwise null.
 */
export function getNodeById(id: string, scene: Scene) {
	const node = scene.getNodeById(id);
	if (node) {
		return node;
	}

	const clusteredLightContainers = scene.lights.filter((light) => isClusteredLightContainer(light));
	for (const clusteredLightContainer of clusteredLightContainers) {
		const lightNode = clusteredLightContainer.lights.find((light) => light.id === id);
		if (lightNode) {
			return lightNode;
		}
	}

	return null;
}
