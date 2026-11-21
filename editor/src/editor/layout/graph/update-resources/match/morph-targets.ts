import { MorphTarget, MorphTargetManager } from "babylonjs";

import { IMatchItem, matchItems } from "./matcher";
import { INameInfo, createNameInfo, getNameSimilarity } from "./names";
import { getRatio, getWeightedAverage } from "./similarity";

/**
 * Defines a morph target prepared for the matching.
 */
export interface IMorphTargetMatchItem extends IMatchItem {
	/**
	 * Defines the reference to the morph target.
	 */
	target: MorphTarget;
	/**
	 * Defines the information about the name of the morph target without its first word. The editor prefixes the names of
	 * the imported morph targets with the name of their mesh: "Face_Smile" for the "Smile" target of the "Face" mesh.
	 */
	unprefixedName: INameInfo;
	/**
	 * Defines the number of position components of the morph target.
	 */
	positions: number;
}

/**
 * Creates the items of all the morph targets of the given morph target manager.
 * @param manager defines the reference to the morph target manager.
 */
export function createMorphTargetMatchItems(manager: MorphTargetManager): IMorphTargetMatchItem[] {
	const items: IMorphTargetMatchItem[] = [];

	for (let i = 0; i < manager.numTargets; ++i) {
		const target = manager.getTarget(i);
		const separatorIndex = target.name.indexOf("_");

		items.push({
			target,
			index: i,
			parent: null,
			children: [],
			name: createNameInfo(target.name),
			unprefixedName: createNameInfo(separatorIndex === -1 ? target.name : target.name.substring(separatorIndex + 1)),
			positions: target.getPositions()?.length ?? 0,
		});
	}

	return items;
}

/**
 * Matches the morph targets of the given manager of the scene with the morph targets of the given manager of the asset:
 * first the targets of the scene whose name ends with the name of a target of the asset (the editor prefixes the names of
 * the imported targets with the name of their mesh), then by name and similarity, and finally the remaining targets in
 * order when they are as many on both sides.
 * @param sceneManager defines the reference to the morph target manager of the scene.
 * @param assetManager defines the reference to the morph target manager of the asset.
 * @returns the map of the morph targets of the scene per morph target of the asset.
 */
export function matchMorphTargets(sceneManager: MorphTargetManager, assetManager: MorphTargetManager): Map<MorphTarget, MorphTarget> {
	const sceneItems = createMorphTargetMatchItems(sceneManager);
	const assetItems = createMorphTargetMatchItems(assetManager);

	// Longest names first: "Face_Smile_Left" must be pinned to "Smile_Left" before "Left" is tested.
	const pinned: [IMorphTargetMatchItem, IMorphTargetMatchItem][] = [];
	const pinnedSceneItems = new Set<IMorphTargetMatchItem>();

	assetItems
		.slice()
		.sort((a, b) => b.target.name.length - a.target.name.length)
		.forEach((assetItem) => {
			const assetName = assetItem.target.name;
			const candidates = sceneItems.filter((sceneItem) => {
				return !pinnedSceneItems.has(sceneItem) && (sceneItem.target.name === assetName || sceneItem.target.name.endsWith(`_${assetName}`));
			});

			if (candidates.length === 1) {
				pinned.push([candidates[0], assetItem]);
				pinnedSceneItems.add(candidates[0]);
			}
		});

	const matches = matchItems(sceneItems, assetItems, {
		pinned,
		minimumScore: 0.6,
		isCompatible: () => true,
		getScore: (scene, asset) => getMorphTargetScore(scene, asset),
	});

	const result = new Map(matches.list.map((match) => [match.asset.target, match.scene.target]));

	const remainingSceneItems = sceneItems.filter((item) => !matches.hasScene(item));
	const remainingAssetItems = assetItems.filter((item) => !matches.hasAsset(item));

	if (remainingSceneItems.length === remainingAssetItems.length) {
		remainingAssetItems.forEach((assetItem, index) => result.set(assetItem.target, remainingSceneItems[index].target));
	}

	return result;
}

/**
 * Returns the similarity score of the given morph targets, from 0 to 1: mostly the name (with or without the prefix added by
 * the editor), then the number of vertices and the order. Returns 0 when the names don't look alike.
 */
function getMorphTargetScore(scene: IMorphTargetMatchItem, asset: IMorphTargetMatchItem): number {
	const name = Math.max(getNameSimilarity(scene.name, asset.name), getNameSimilarity(scene.unprefixedName, asset.name));
	if (name < 0.6) {
		return 0;
	}

	return getWeightedAverage([
		[name, 4],
		[getRatio(scene.positions, asset.positions), 1],
		[1 / (1 + Math.abs(scene.index - asset.index)), 1],
	]);
}
