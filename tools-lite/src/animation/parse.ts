import { SceneContext } from "@babylonjs/lite";

import { EditorAnimation } from "./animation";
import { EditorAnimationGroup } from "./animation-group";

/**
 * Parses the given serialized Babylon.js animation group (`AnimationGroup.serialize`) and creates the equivalent
 * animation group of the tools.
 * @param scene defines the reference to the scene where to create the animation group.
 * @param data defines the serialized animation group.
 * @param targetLookup defines the function used to retrieve the target of each targeted animation from its serialized data.
 */
export function parseAnimationGroup(scene: SceneContext, data: any, targetLookup: (targetedAnimationData: any) => any): EditorAnimationGroup {
	const animationGroup = new EditorAnimationGroup(data.name, scene);

	for (const targetedAnimationData of data.targetedAnimations ?? []) {
		const target = targetLookup(targetedAnimationData);
		if (!target) {
			continue;
		}

		const animation = EditorAnimation.Parse(targetedAnimationData.animation);
		animationGroup.addTargetedAnimation(animation, target);
	}

	if (data.from !== null && data.from !== undefined && data.to !== null && data.to !== undefined) {
		animationGroup.normalize(data.from, data.to);
	}

	if (data.speedRatio !== undefined) {
		animationGroup.speedRatio = data.speedRatio;
	}

	if (data.loopAnimation !== undefined) {
		animationGroup.loopAnimation = data.loopAnimation;
	}

	if (data.isAdditive !== undefined) {
		animationGroup.isAdditive = data.isAdditive;
	}

	if (data.weight !== undefined) {
		animationGroup.weight = data.weight;
	}

	if (data.metadata !== undefined) {
		animationGroup.metadata = data.metadata;
	}

	return animationGroup;
}

/**
 * Starts the given animations on the given target, the equivalent of Babylon.js `scene.beginDirectAnimation`.
 * @param scene defines the reference to the scene where the target is.
 * @param target defines the object to animate.
 * @param animations defines the list of animations to play.
 * @param from defines the first frame to play.
 * @param to defines the last frame to play.
 * @param loop defines wether or not the animations loop.
 * @param speedRatio defines the speed ratio of the animations.
 * @param onAnimationEnd defines an optional callback called when the animations end.
 * @returns the animation group playing the animations.
 */
// eslint-disable-next-line max-params
export function beginDirectAnimation(
	scene: SceneContext,
	target: any,
	animations: EditorAnimation[],
	from: number,
	to: number,
	loop: boolean = false,
	speedRatio: number = 1,
	onAnimationEnd?: () => void
): EditorAnimationGroup {
	const animationGroup = new EditorAnimationGroup(`${target?.name ?? "target"}-animations`, scene);
	animations.forEach((animation) => animationGroup.addTargetedAnimation(animation, target));

	if (onAnimationEnd) {
		animationGroup.onAnimationGroupEndObservable.addOnce(() => onAnimationEnd());
	}

	animationGroup.start(loop, speedRatio, from, to);

	return animationGroup;
}

/**
 * Parses the animations saved on the given serialized node (`node.animations`) and starts them when the node was
 * configured to animate automatically (`autoAnimate`), as the Babylon.js scene loader does.
 * @param scene defines the reference to the scene where the node is.
 * @param node defines the reference to the node to animate.
 * @param data defines the serialized node.
 * @returns the animation group created for the animations of the node, or null if the node has no animation.
 */
export function parseNodeAnimations(scene: SceneContext, node: any, data: any): EditorAnimationGroup | null {
	if (!data.animations?.length) {
		return null;
	}

	const animations = (data.animations as any[]).map((animationData) => EditorAnimation.Parse(animationData));

	(node as any).animations = animations;

	if (!data.autoAnimate) {
		return null;
	}

	return beginDirectAnimation(scene, node, animations, data.autoAnimateFrom ?? 0, data.autoAnimateTo ?? 0, data.autoAnimateLoop ?? false, data.autoAnimateSpeed ?? 1);
}
