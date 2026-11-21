import { Animation, AnimationGroup, Scene } from "babylonjs";

import { UniqueNumber } from "../../../../../tools/tools";

import { IUpdateResourcesAnimationGroupItem } from "../types";

import { UpdateResourcesContext } from "./context";

/**
 * Updates the animation group of the given item from its animation group of the asset, or adds it to the scene when it doesn't
 * exist yet in the copy. The animations of the asset are cloned and retargeted to the objects of the copy (nodes, joints,
 * bones and morph targets, see UpdateResourcesContext.resolveTarget). The animations whose target can't be found are skipped.
 * An existing animation group keeps its identity and settings (name, unique id, loop, speed, weight, metadata...) so the
 * references to it stay valid: only its animations are replaced. It is restarted if it was playing.
 * @param context defines the context of the update.
 * @param item defines the item describing the animation group to update.
 */
export function updateAnimationGroup(context: UpdateResourcesContext, item: IUpdateResourcesAnimationGroupItem): void {
	const assetAnimationGroup = item.match;
	if (!assetAnimationGroup) {
		return;
	}

	const targetedAnimations: { animation: Animation; target: any }[] = [];
	assetAnimationGroup.targetedAnimations.forEach((targetedAnimation) => {
		const target = context.resolveTarget(item.copy, targetedAnimation.target);
		if (target) {
			targetedAnimations.push({ target, animation: targetedAnimation.animation });
		}
	});

	const skippedCount = assetAnimationGroup.targetedAnimations.length - targetedAnimations.length;

	if (!targetedAnimations.length) {
		context.warn(`Animation group "${assetAnimationGroup.name}" skipped: none of the objects it animates were found in "${item.copy.sceneRoot.name}".`);
		return;
	}

	if (skippedCount) {
		context.warn(
			`Animation group "${assetAnimationGroup.name}": ${skippedCount} animation(s) skipped as the objects they animate were not found in "${item.copy.sceneRoot.name}".`
		);
	}

	const animationGroup = item.animationGroup ?? createAnimationGroup(context.scene, assetAnimationGroup);

	const wasPlaying = animationGroup.isPlaying;
	if (animationGroup.isStarted) {
		animationGroup.stop();
	}

	animationGroup.targetedAnimations.slice().forEach((targetedAnimation) => animationGroup.removeTargetedAnimation(targetedAnimation.animation));

	// The range is computed again from the keys of the new animations.
	animationGroup.from = Number.MAX_VALUE;
	animationGroup.to = -Number.MAX_VALUE;

	targetedAnimations.forEach(({ animation, target }) => {
		animationGroup.addTargetedAnimation(animation.clone(true), target);
	});

	animationGroup.from = assetAnimationGroup.from;
	animationGroup.to = assetAnimationGroup.to;

	if (wasPlaying) {
		animationGroup.play(animationGroup.loopAnimation);
	}

	if (item.animationGroup) {
		++context.report.updatedAnimationGroups;
	} else {
		++context.report.addedAnimationGroups;
	}
}

/**
 * Creates a new empty animation group in the scene with the settings of the given animation group of the asset.
 */
function createAnimationGroup(scene: Scene, source: AnimationGroup): AnimationGroup {
	const animationGroup = new AnimationGroup(source.name, scene, source.weight, source.playOrder);
	animationGroup.uniqueId = UniqueNumber.Get();

	animationGroup.speedRatio = source.speedRatio;
	animationGroup.loopAnimation = source.loopAnimation;
	animationGroup.isAdditive = source.isAdditive;
	animationGroup.enableBlending = source.enableBlending;
	animationGroup.blendingSpeed = source.blendingSpeed;
	animationGroup.metadata = source.metadata ? { ...source.metadata } : null;

	return animationGroup;
}
