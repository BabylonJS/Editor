import {
	addBoxObstacle,
	addCylinderObstacle,
	createNavigationPluginAsync,
	createNavMesh,
	disposeNavigationPlugin,
	Mesh,
	NavigationPlugin,
	ObstacleHandle,
	removeObstacle,
} from "@babylonjs/lite";

import { loadFile, loadJsonFile } from "../../../../tools/request";
import { isAbstractMesh } from "../../../../tools/guards";
import { getAbsolutePosition } from "../../../../tools/maths";
import { getMeshWorldBoundingBox } from "../../../../tools/mesh";
import { RecastNavigationHelper } from "../../../../tools/navmesh";
import { getNodeById, getSceneData } from "../../../../tools/scene";
import { getMeshLodLevels } from "../../../mesh";

import { IScriptAssetParserParameters, registerScriptAssetParser } from "../../preload";

/**
 * Imports the navmesh data baked by the editor (`navmesh.bin` and `tilecache.bin`) in the given navigation plugin,
 * the same way the Babylon.js navigation plugin does (`buildFromNavmeshData` and `buildFromTileCacheData`).
 * Babylon Lite has no public function to import baked navmesh data: the data is imported using the Recast module
 * the navigation plugin of Babylon Lite is built on.
 * @returns false if the navigation plugin of Babylon Lite doesn't expose the Recast module.
 */
function importBakedNavMesh(plugin: NavigationPlugin, navMeshData: ArrayBuffer | null, tileCacheData: ArrayBuffer | null): boolean {
	const internal = plugin as NavigationPlugin & { _recast?: any; _navMesh?: any; _navMeshQuery?: any; _tileCache?: any };
	const recast = internal._recast;

	if (!recast?.importNavMesh || !recast?.importTileCache || !recast?.NavMeshQuery || !recast?.TileCacheMeshProcess || (!navMeshData && !tileCacheData)) {
		return false;
	}

	disposeNavigationPlugin(plugin);

	if (navMeshData && !tileCacheData) {
		const result = recast.importNavMesh(new Uint8Array(navMeshData));
		internal._navMesh = result.navMesh;
		internal._navMeshQuery = new recast.NavMeshQuery(result.navMesh);
		return true;
	}

	// Same as the default tile cache mesh process of Babylon.js (area 0, flags 1, no off-mesh connection).
	const tileCacheMeshProcess = new recast.TileCacheMeshProcess((navMeshCreateParams: any, polyAreas: any, polyFlags: any) => {
		for (let i = 0; i < navMeshCreateParams.polyCount(); ++i) {
			polyAreas.set(i, 0);
			polyFlags.set(i, 1);
		}
	});

	const result = recast.importTileCache(new Uint8Array(tileCacheData!), tileCacheMeshProcess);
	internal._navMesh = result.navMesh;
	internal._tileCache = result.tileCache;
	internal._navMeshQuery = new recast.NavMeshQuery(result.navMesh);

	return true;
}

/**
 * Builds the navigation mesh at runtime from the static meshes and the parameters saved in `config.json`, when the
 * baked data can't be imported. The removal of the isolated areas configured in the editor is not applied.
 */
function buildNavMesh(plugin: NavigationPlugin, parameters: IScriptAssetParserParameters, config: any): void {
	const meshes: Mesh[] = [];
	(config.staticMeshes ?? []).forEach((staticMesh: any) => {
		if (staticMesh.enabled === false) {
			return;
		}

		let node = getNodeById(staticMesh.id, parameters.scene);
		if (!isAbstractMesh(node)) {
			return;
		}

		if (config.useLowestLods) {
			const levels = getMeshLodLevels(node).filter((level) => level.mesh);
			node = levels[0]?.mesh ?? node;
		}

		meshes.push(node as Mesh);
	});

	if (config.isolatedAreas?.remove) {
		console.warn(`Babylon.js Editor Tools Lite: the removal of the isolated areas of the navmesh "${parameters.key}" is not applied when the navmesh is built at runtime.`);
	}

	createNavMesh(plugin, meshes, {
		...config.navMeshParameters,
		maxObstacles: config.navMeshParameters?.maxObstacles ?? ((config.obstacleMeshes ?? []).length ? 128 : 0),
	});
}

/**
 * Loads the navigation mesh saved by the editor (`.navmesh` folder): the baked navmesh data (`navmesh.bin` and
 * `tilecache.bin`) is imported in a navigation plugin of Babylon Lite and the obstacles are created.
 * @param parameters defines the parameters of the asset to load.
 */
export async function preloadNavMeshScriptAsset(parameters: IScriptAssetParserParameters) {
	const loadOptionalFile = (name: string) => loadFile(`${parameters.rootUrl}${parameters.key}/${name}`, "arraybuffer").catch(() => null);

	const [config, navMeshData, tileCacheData] = await Promise.all([
		loadJsonFile<any>(`${parameters.rootUrl}${parameters.key}/config.json`),
		loadOptionalFile("navmesh.bin"),
		loadOptionalFile("tilecache.bin"),
	]);

	const recast = (await createNavigationPluginAsync()) as RecastNavigationHelper;

	if (!importBakedNavMesh(recast, navMeshData, tileCacheData)) {
		buildNavMesh(recast, parameters, config);
	}

	const obstacleMeshes = (config.obstacleMeshes ?? []) as any[];

	getSceneData(parameters.scene).onDisposeObservable.addOnce(() => {
		disposeNavigationPlugin(recast);
	});

	const createdObstacles: ObstacleHandle[] = [];

	recast.refreshObstacles = function () {
		createdObstacles.forEach((obstacle) => removeObstacle(recast, obstacle));
		createdObstacles.splice(0, createdObstacles.length);

		obstacleMeshes.forEach((obstacle) => {
			const node = getNodeById(obstacle.id, parameters.scene);
			if (!isAbstractMesh(node)) {
				return;
			}

			const position = getAbsolutePosition(node);
			const extendSize = getMeshWorldBoundingBox(node).extendSize;

			switch (obstacle.type) {
				case "box":
					const boxObstacle = addBoxObstacle(recast, position, extendSize, obstacle.angle);
					if (boxObstacle) {
						createdObstacles.push(boxObstacle);
					}
					break;

				case "cylinder":
					const cylinderObstacle = addCylinderObstacle(recast, position, extendSize.x, extendSize.y);
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
