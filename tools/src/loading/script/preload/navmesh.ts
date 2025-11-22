import { CreateNavigationPluginAsync } from "@babylonjs/addons";

export async function preloadNavMeshScriptAsset(key: string, rootUrl: string) {
	const [navmeshResponse, tilesResponse] = await Promise.all([fetch(`${rootUrl}${key}/navmesh.bin`), fetch(`${rootUrl}${key}/tilecache.bin`)]);
	const [navmeshData, tilesData] = await Promise.all([navmeshResponse.arrayBuffer(), tilesResponse.arrayBuffer()]);

	const [recastCore, recastGenerators] = await Promise.all([import("@recast-navigation/core"), import("@recast-navigation/generators")]);

	const recast = await CreateNavigationPluginAsync({
		instance: {
			...recastCore,
			...recastGenerators,
		},
	});
	recast.buildFromNavmeshData(new Uint8Array(navmeshData));
	recast.buildFromTileCacheData(new Uint8Array(tilesData));

	return recast;
}
