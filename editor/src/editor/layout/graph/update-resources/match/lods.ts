import { Mesh } from "babylonjs";

import { IGeometrySignature, getGeometrySignature, getGeometrySimilarity } from "./geometry";
import { IMatchItem, matchItems } from "./matcher";
import { createNameInfo, getNameSimilarity } from "./names";
import { getRatio, getWeightedAverage } from "./similarity";

/**
 * Defines a LOD level of a mesh that has a mesh (the levels without mesh only hide the mesh beyond their distance).
 */
export interface ILodLevel {
	/**
	 * Defines the reference to the mesh rendered for the LOD level.
	 */
	mesh: Mesh;
	/**
	 * Defines the distance (or the screen coverage) from which the LOD level is used.
	 */
	distance: number;
}

/**
 * Defines a LOD level prepared for the matching.
 */
export interface ILodMatchItem extends IMatchItem {
	/**
	 * Defines the LOD level described by the item.
	 */
	level: ILodLevel;
	/**
	 * Defines the signature of the geometry of the mesh of the LOD level.
	 */
	geometry: IGeometrySignature | null;
}

/**
 * Defines the result of the matching of the LOD levels of a mesh of the scene with the LOD levels of a mesh of the asset.
 */
export interface ILodLevelsMatch {
	/**
	 * Defines the LOD levels of the scene matched with the LOD levels of the asset: they are updated from the asset.
	 */
	pairs: { scene: ILodLevel; asset: ILodLevel }[];
	/**
	 * Defines the LOD levels of the asset not found in the scene: they are added to the scene.
	 */
	added: ILodLevel[];
	/**
	 * Defines the LOD levels of the scene not found in the asset: removed by the artist, or added in the editor. They are kept
	 * unless the user chooses to remove them.
	 */
	unmatched: ILodLevel[];
}

/**
 * Returns whether or not the given mesh has LOD levels.
 * @param mesh defines the reference to the mesh to test.
 */
export function hasLodLevels(mesh: Mesh | null): boolean {
	return !!mesh && mesh.getLODLevels().length > 0;
}

/**
 * Returns the LOD levels of the given mesh that have a mesh, in the order of Babylon.js (sorted by distance, from the farthest
 * to the closest, or by screen coverage).
 * @param mesh defines the reference to the mesh to get the LOD levels from.
 */
export function getLodLevels(mesh: Mesh): ILodLevel[] {
	return mesh
		.getLODLevels()
		.filter((level) => level.mesh)
		.map((level) => ({ mesh: level.mesh!, distance: level.distanceOrScreenCoverage }));
}

/**
 * Matches the LOD levels of the given mesh of the scene with the LOD levels of the given mesh of the asset, by name then by
 * similarity (name, geometry, order and distance). Unlike the other objects, the remaining LOD levels are never matched in
 * order: a LOD level of the scene without counterpart may have been added in the editor and must not be replaced.
 * @param sceneMesh defines the reference to the mesh of the scene.
 * @param assetMesh defines the reference to the mesh of the asset.
 */
export function matchLodLevels(sceneMesh: Mesh, assetMesh: Mesh): ILodLevelsMatch {
	const sceneItems = createLodMatchItems(sceneMesh);
	const assetItems = createLodMatchItems(assetMesh);

	const matches = matchItems(sceneItems, assetItems, {
		minimumScore: 0.6,
		isCompatible: () => true,
		getScore: (scene, asset) => getLodScore(scene, asset),
	});

	return {
		pairs: matches.list.map((match) => ({ scene: match.scene.level, asset: match.asset.level })),
		added: assetItems.filter((item) => !matches.hasAsset(item)).map((item) => item.level),
		unmatched: sceneItems.filter((item) => !matches.hasScene(item)).map((item) => item.level),
	};
}

/**
 * Creates the items of the LOD levels of the given mesh that have a mesh.
 */
function createLodMatchItems(mesh: Mesh): ILodMatchItem[] {
	return getLodLevels(mesh).map((level, index) => ({
		level,
		index,
		parent: null,
		children: [],
		name: createNameInfo(level.mesh.name),
		geometry: getGeometrySignature(level.mesh),
	}));
}

/**
 * Returns the similarity score of the given LOD levels, from 0 to 1, combining the name, the geometry, the order and the
 * distance. Returns 0 when neither the names nor the geometries look alike.
 */
function getLodScore(scene: ILodMatchItem, asset: ILodMatchItem): number {
	const name = getNameSimilarity(scene.name, asset.name);
	const geometry = scene.geometry && asset.geometry ? getGeometrySimilarity(scene.geometry, asset.geometry) : null;

	if (name < 0.6 && (geometry ?? 0) < 0.9) {
		return 0;
	}

	return getWeightedAverage([
		[name, 4],
		[geometry, 2],
		[1 / (1 + Math.abs(scene.index - asset.index)), 1],
		[getRatio(scene.level.distance, asset.level.distance), 1],
	]);
}
