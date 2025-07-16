import { Scene, AnimationGroup, TargetedAnimation } from "babylonjs";

import { isAbstractMesh, isBone } from "../guards/nodes";

/**
 * Gets a new map containing for each animation group the targeted animations that are linked to the given targets.
 * @param targets defines the array of targets to check for linked animations (meshes, transform nodes, etc.).
 * @param scene defines the reference to the scene to check for animation groups.
 */
export function getLinkedAnimationGroupsFor(targets: any[], scene: Scene): Map<AnimationGroup, TargetedAnimation[]> {
	const result = new Map<AnimationGroup, TargetedAnimation[]>();

	scene.animationGroups.forEach((animationGroup) => {
		const targetedAnimations = animationGroup.targetedAnimations.filter((targetedAnimation) => {
			if (isBone(targetedAnimation.target)) {
				const bones = targets
					.filter((target) => isAbstractMesh(target))
					.map((target) => target.skeleton?.bones ?? [])
					.flat();

				const bone = bones.find((bone) => bone === targetedAnimation.target);
				if (bone) {
					return true;
				}
			}

			return targets.includes(targetedAnimation.target);
		});

		if (targetedAnimations) {
			if (!result.has(animationGroup)) {
				result.set(animationGroup, targetedAnimations);
			} else {
				result.get(animationGroup)?.push(...targetedAnimations);
			}
		}
	});

	return result;
}
