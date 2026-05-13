import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import { CreateNavigationPluginAsync } from "@babylonjs/addons";

import { loadFile, loadJsonFile } from "../../../../tools/request";

import { IScriptAssetParserParameters, registerScriptAssetParser } from "../../preload";

export async function preloadNavMeshScriptAsset(parameters: IScriptAssetParserParameters) {
	const [config, navmeshData, tilesData] = await Promise.all([
		loadJsonFile<any>(`${parameters.rootUrl}${parameters.key}/config.json`),
		loadFile(`${parameters.rootUrl}${parameters.key}/navmesh.bin`, "arraybuffer"),
		loadFile(`${parameters.rootUrl}${parameters.key}/tilecache.bin`, "arraybuffer"),
	]);

	const [recastCore, recastGenerators] = await Promise.all([import("@recast-navigation/core"), import("@recast-navigation/generators")]);

	const recast = await CreateNavigationPluginAsync({
		instance: {
			...recastCore,
			...recastGenerators,
		},
	});
	recast.buildFromNavmeshData(new Uint8Array(navmeshData));
	recast.buildFromTileCacheData(new Uint8Array(tilesData));

	config.obstacleMeshes.forEach((obstacle: any) => {
		switch (obstacle.type) {
			case "box":
				recast.addBoxObstacle(Vector3.FromArray(obstacle.position), Vector3.FromArray(obstacle.extent), obstacle.angle);
				break;

			case "cylinder":
				recast.addCylinderObstacle(Vector3.FromArray(obstacle.position), obstacle.radius, obstacle.height);
				break;
		}
	});

	return recast;
}

registerScriptAssetParser("navmesh", preloadNavMeshScriptAsset);
