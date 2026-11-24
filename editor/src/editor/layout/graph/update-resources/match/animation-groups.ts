import { AnimationGroup } from "babylonjs";

import { isMesh } from "../../../../../tools/guards/nodes";

import { IUpdateResourcesCopy, IUpdateResourcesNodeItem } from "../types";

import { getGeometryMesh } from "./geometry";
import { IMatchItem, Matches, matchItems } from "./matcher";
import { createNameInfo, getNameSimilarity } from "./names";
import { getJaccardIndex, getRatio, getWeightedAverage } from "./similarity";

/**
 * Defines an animation group prepared for the matching.
 */
export interface IAnimationGroupMatchItem extends IMatchItem {
	/**
	 * Defines the reference to the animation group.
	 */
	animationGroup: AnimationGroup;
	/**
	 * Defines the normalized names of the objects animated by the animation group.
	 */
	targets: Set<string>;
	/**
	 * Defines the length of the animation group, in frames.
	 */
	length: number;
}

/**
 * Creates the items of the given animation groups.
 * @param animationGroups defines the list of animation groups.
 */
export function createAnimationGroupMatchItems(animationGroups: AnimationGroup[]): IAnimationGroupMatchItem[] {
	return animationGroups.map((animationGroup, index) => ({
		index,
		animationGroup,
		parent: null,
		children: [],
		name: createNameInfo(animationGroup.name),
		length: animationGroup.to - animationGroup.from,
		targets: new Set(animationGroup.targetedAnimations.map((targetedAnimation) => createNameInfo(targetedAnimation.target?.name).normalized)),
	}));
}

/**
 * Returns the copy of the asset animated by each of the given animation groups of the scene: the copy containing most of
 * the objects animated by the animation group (nodes, and bones, joints and morph targets of their meshes, so updating only
 * a skinned mesh also updates the animations of its skeleton). Animation groups that animate nothing in the copies are ignored.
 * @param animationGroups defines the list of the animation groups of the scene.
 * @param nodes defines the list of the nodes of the edited hierarchy with their copy.
 */
export function getAnimationGroupsCopies(animationGroups: AnimationGroup[], nodes: IUpdateResourcesNodeItem[]): Map<AnimationGroup, IUpdateResourcesCopy> {
	const copiesByTarget = new Map<unknown, IUpdateResourcesCopy>();

	nodes.forEach((item) => {
		if (item.copy) {
			copiesByTarget.set(item.node, item.copy);
		}
	});

	nodes.forEach((item) => {
		const copy = item.copy;
		if (!copy || !isMesh(item.node)) {
			return;
		}

		item.node.skeleton?.bones.forEach((bone) => {
			copiesByTarget.set(bone, copy);

			const joint = bone.getTransformNode();
			if (joint && !copiesByTarget.has(joint)) {
				copiesByTarget.set(joint, copy);
			}
		});

		const manager = item.node.morphTargetManager;
		for (let i = 0; i < (manager?.numTargets ?? 0); ++i) {
			copiesByTarget.set(manager!.getTarget(i), copy);
		}
	});

	const result = new Map<AnimationGroup, IUpdateResourcesCopy>();

	animationGroups.forEach((animationGroup) => {
		const votes = new Map<IUpdateResourcesCopy, number>();
		animationGroup.targetedAnimations.forEach((targetedAnimation) => {
			const copy = copiesByTarget.get(targetedAnimation.target);
			if (copy) {
				votes.set(copy, (votes.get(copy) ?? 0) + 1);
			}
		});

		let bestCopy: IUpdateResourcesCopy | null = null;
		let bestVotes = 0;
		for (const [copy, count] of votes) {
			if (count > bestVotes) {
				bestVotes = count;
				bestCopy = copy;
			}
		}

		if (bestCopy) {
			result.set(animationGroup, bestCopy);
		}
	});

	return result;
}

/**
 * Matches the given animation groups of a copy of the asset in the scene with the animation groups of the asset, by name
 * then by similarity (name, animated objects, length and order).
 * @param sceneItems defines the items of the animation groups of the scene animating the copy.
 * @param assetItems defines the items of the animation groups of the asset.
 */
export function matchAnimationGroups(sceneItems: IAnimationGroupMatchItem[], assetItems: IAnimationGroupMatchItem[]): Matches<IAnimationGroupMatchItem> {
	return matchItems(sceneItems, assetItems, {
		minimumScore: 0.6,
		isCompatible: () => true,
		getScore: (scene, asset) => getAnimationGroupScore(scene, asset),
	});
}

/**
 * Returns the similarity score of the given animation groups, from 0 to 1, combining the name, the animated objects, the
 * length and the order. Returns 0 when the names don't look alike, unless the animation groups animate the same objects for
 * the same length (animations exported with default names like "Take 001" can only be told apart that way).
 */
function getAnimationGroupScore(scene: IAnimationGroupMatchItem, asset: IAnimationGroupMatchItem): number {
	const name = getNameSimilarity(scene.name, asset.name);
	const targets = getJaccardIndex(scene.targets, asset.targets);
	const length = getRatio(scene.length, asset.length);

	if (name < 0.6 && (targets < 0.8 || length < 0.95)) {
		return 0;
	}

	return getWeightedAverage([
		[name, 3],
		[targets, 2],
		[length, 1],
		[1 / (1 + Math.abs(scene.index - asset.index)), 0.5],
	]);
}

/**
 * Returns the number of animations of the given animation group of the asset whose target can be found in the given copy:
 * matched nodes, and bones, joints and morph targets of the matched meshes (the missing joints are created with the skeleton).
 * @param animationGroup defines the reference to the animation group of the asset.
 * @param copy defines the copy of the asset to animate.
 * @param nodes defines the list of the nodes of the edited hierarchy with their match.
 */
export function getResolvedAnimationsCount(animationGroup: AnimationGroup, copy: IUpdateResourcesCopy, nodes: IUpdateResourcesNodeItem[]): number {
	const targets = new Set<unknown>();

	nodes.forEach((item) => {
		if (item.copy !== copy || !item.match) {
			return;
		}

		targets.add(item.match);

		const assetMesh = getGeometryMesh(item.match);
		if (!assetMesh || !isMesh(item.node)) {
			return;
		}

		assetMesh.skeleton?.bones.forEach((bone) => {
			targets.add(bone);
			targets.add(bone.getTransformNode());
		});

		const manager = assetMesh.morphTargetManager;
		for (let i = 0; i < (manager?.numTargets ?? 0); ++i) {
			targets.add(manager!.getTarget(i));
		}
	});

	return animationGroup.targetedAnimations.filter((targetedAnimation) => targets.has(targetedAnimation.target)).length;
}
