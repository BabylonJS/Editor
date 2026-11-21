import { Bone, Skeleton, TransformNode, Vector3 } from "babylonjs";

import { IMatchItem, Matches, getMatchedChildrenRatio, matchItems } from "./matcher";
import { areOppositeSides, createNameInfo, getNameSimilarity } from "./names";
import { getJaccardIndex, getPositionSimilarity, getWeightedAverage } from "./similarity";

/**
 * Defines a bone of a skeleton prepared for the matching.
 */
export interface IBoneMatchItem extends IMatchItem {
	/**
	 * Defines the reference to the bone.
	 */
	bone: Bone;
	/**
	 * Defines the item of the parent bone, or null for the root bones.
	 */
	parent: IBoneMatchItem | null;
	/**
	 * Defines the items of the children bones.
	 */
	children: IBoneMatchItem[];
	/**
	 * Defines the position of the bone relative to its parent, in rest pose.
	 */
	position: Vector3;
	/**
	 * Defines the normalized names of the children bones.
	 */
	childrenNames: Set<string>;
}

/**
 * Creates the items of all the bones of the given skeleton, linked to each other following the hierarchy of the bones.
 * @param skeleton defines the reference to the skeleton.
 */
export function createBoneMatchItems(skeleton: Skeleton): IBoneMatchItem[] {
	const items = new Map<Bone, IBoneMatchItem>();

	skeleton.bones.forEach((bone) => {
		items.set(bone, {
			bone,
			index: 0,
			parent: null,
			children: [],
			childrenNames: new Set<string>(),
			name: createNameInfo(bone.name),
			position: bone.getRestMatrix().getTranslation(),
		});
	});

	items.forEach((item) => {
		const parent = item.bone.getParent();
		const parentItem = parent ? items.get(parent) : null;

		if (parentItem) {
			item.parent = parentItem;
			item.index = parentItem.children.length;

			parentItem.children.push(item);
			parentItem.childrenNames.add(item.name.normalized);
		}
	});

	return Array.from(items.values());
}

/**
 * Matches the bones of the given skeleton of the scene with the bones of the given skeleton of the asset. The bones linked to
 * transform nodes (glTF) are matched first through the nodes they are linked to, then the remaining bones are matched by name,
 * by similarity (name, parent, rest position, children) and by structure.
 * @param sceneSkeleton defines the reference to the skeleton of the scene.
 * @param assetSkeleton defines the reference to the skeleton of the asset.
 * @param resolveSceneNode defines the function returning the node of the scene matched with a node of the asset, if any.
 * @returns the map of the bones of the scene per bone of the asset.
 */
export function matchSkeletonBones(sceneSkeleton: Skeleton, assetSkeleton: Skeleton, resolveSceneNode: (assetNode: TransformNode) => TransformNode | null): Map<Bone, Bone> {
	const sceneItems = createBoneMatchItems(sceneSkeleton);
	const assetItems = createBoneMatchItems(assetSkeleton);

	const sceneItemsByNode = new Map<TransformNode, IBoneMatchItem>();
	sceneItems.forEach((item) => {
		const node = item.bone.getTransformNode();
		if (node) {
			sceneItemsByNode.set(node, item);
		}
	});

	const pinned: [IBoneMatchItem, IBoneMatchItem][] = [];
	assetItems.forEach((assetItem) => {
		const assetNode = assetItem.bone.getTransformNode();
		const sceneNode = assetNode ? resolveSceneNode(assetNode) : null;
		const sceneItem = sceneNode ? sceneItemsByNode.get(sceneNode) : undefined;

		if (sceneItem) {
			pinned.push([sceneItem, assetItem]);
		}
	});

	const matches = matchItems(sceneItems, assetItems, {
		pinned,
		minimumScore: 0.55,
		minimumStructureScore: 0.3,
		isCompatible: (scene, asset) => !areOppositeSides(scene.name, asset.name),
		getScore: (scene, asset, current) => getBoneScore(scene, asset, current),
	});

	return new Map(matches.list.map((match) => [match.asset.bone, match.scene.bone]));
}

/**
 * Returns the similarity score of the given bones, from 0 to 1, combining the name, the parent, the rest position relative
 * to the parent, the children (same names or already matched together) and the index among the siblings. Returns 0 when nothing proves that the bones
 * are the same: a similar name, the same offset under the same parent or similar children.
 */
function getBoneScore(scene: IBoneMatchItem, asset: IBoneMatchItem, matches: Matches<IBoneMatchItem>): number {
	const name = getNameSimilarity(scene.name, asset.name);

	const sceneParentMatch = scene.parent ? matches.getAsset(scene.parent) : null;
	const isParentMatched = sceneParentMatch !== null && sceneParentMatch === asset.parent;

	let parent = 0.5;
	if (!scene.parent && !asset.parent) {
		parent = 1;
	} else if (sceneParentMatch) {
		parent = isParentMatched ? 1 : 0;
	}

	const position = getPositionSimilarity(scene.position, asset.position);
	const hasOffset = scene.position.lengthSquared() > 1e-12 || asset.position.lengthSquared() > 1e-12;

	// Children having the same names, or children already matched with each other (found by geometry, position...).
	const children =
		scene.children.length || asset.children.length ? Math.max(getJaccardIndex(scene.childrenNames, asset.childrenNames), getMatchedChildrenRatio(scene, asset, matches)) : null;

	const hasIdentity = name >= 0.6 || (children ?? 0) >= 0.6 || (isParentMatched && hasOffset && position >= 0.9);
	if (!hasIdentity) {
		return 0;
	}

	return getWeightedAverage([
		[name, 4],
		[parent, 2],
		[position, 2],
		[children, 1.5],
		[1 / (1 + Math.abs(scene.index - asset.index)), 0.5],
	]);
}
