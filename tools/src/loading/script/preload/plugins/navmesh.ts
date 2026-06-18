import { IObstacle } from "@babylonjs/core/Navigation/INavigationEngine";

import { CreateNavigationPluginAsync } from "@babylonjs/addons/navigation/factory/factory.single-thread";

import { getNodeById } from "../../../../tools/scene";
import { isAbstractMesh } from "../../../../tools/guards";
import { RecastNavigationHelper } from "../../../../tools/navmesh";
import { loadFile, loadJsonFile } from "../../../../tools/request";

import { IScriptAssetParserParameters, registerScriptAssetParser } from "../../preload";

export async function preloadNavMeshScriptAsset(parameters: IScriptAssetParserParameters) {
	const [config, navmeshData, tilesData] = await Promise.all([
		loadJsonFile<any>(`${parameters.rootUrl}${parameters.key}/config.json`),
		loadFile(`${parameters.rootUrl}${parameters.key}/navmesh.bin`, "arraybuffer"),
		loadFile(`${parameters.rootUrl}${parameters.key}/tilecache.bin`, "arraybuffer"),
	]);

	const [recastCore, recastGenerators] = await Promise.all([import("@recast-navigation/core"), import("@recast-navigation/generators")]);

	const recast = (await CreateNavigationPluginAsync({
		instance: {
			...recastCore,
			...recastGenerators,
		},
	})) as RecastNavigationHelper;
	recast.buildFromNavmeshData(new Uint8Array(navmeshData));
	recast.buildFromTileCacheData(new Uint8Array(tilesData));

	const createdObstacles: IObstacle[] = [];

	recast.refreshObstacles = function () {
		createdObstacles.forEach((obstacle) => recast.removeObstacle(obstacle));
		createdObstacles.splice(0, createdObstacles.length);

		config.obstacleMeshes.forEach((obstacle: any) => {
			const node = getNodeById(obstacle.id, parameters.scene);
			if (!isAbstractMesh(node)) {
				return;
			}

			const position = node.getAbsolutePosition();
			const boundingBox = node.getBoundingInfo().boundingBox;

			switch (obstacle.type) {
				case "box":
					const boxObstacle = recast.addBoxObstacle(position, boundingBox.extendSizeWorld, obstacle.angle);
					if (boxObstacle) {
						createdObstacles.push(boxObstacle);
					}
					break;

				case "cylinder":
					const cylinderObstacle = recast.addCylinderObstacle(position, boundingBox.extendSizeWorld.x, boundingBox.extendSizeWorld.y);
					if (cylinderObstacle) {
						createdObstacles.push(cylinderObstacle);
					}
					break;
			}
		});
	};

	recast.refreshObstacles();

	return recast;
}

registerScriptAssetParser("navmesh", preloadNavMeshScriptAsset);
