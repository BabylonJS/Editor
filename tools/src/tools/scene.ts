import { Scene } from "@babylonjs/core/scene";
import { AssetContainer } from "@babylonjs/core/assetContainer";

import { isClusteredLightContainer } from "./guards";

/**
 * Returns the node with the given name in the given scene.
 * This method also retrieves light nodes from clustered light containers.
 * @param name defines the name of the node to retrieve.
 * @param scene defines the reference to the scene to search the node in.
 * @returns the node if found, otherwise null.
 */
export function getNodeByName(name: string, scene: Scene, container: AssetContainer | null = null) {
	if (container) {
		const node = container.getNodes().find((node) => node.name === name);
		if (node) {
			return node;
		}
	} else {
		const node = scene.getNodeByName(name);
		if (node) {
			return node;
		}
	}

	const clusteredLightContainers = scene.lights.filter((light) => isClusteredLightContainer(light));
	for (const clusteredLightContainer of clusteredLightContainers) {
		const lightNode = clusteredLightContainer.lights.find((light) => {
			if (container) {
				return light.name === name && light._parentContainer === container;
			}

			return light.name === name;
		});
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
